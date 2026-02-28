import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import axios from 'axios';
import { SocialPost, PostStatus } from '../entities/social-post.entity';
import { SocialAccount, SocialPlatform } from '../entities/social-account.entity';

@Processor('social-publisher')
export class SocialPublisherProcessor extends WorkerHost {
    private readonly logger = new Logger(SocialPublisherProcessor.name);

    constructor(
        @InjectRepository(SocialPost)
        private postRepo: Repository<SocialPost>,
        @InjectRepository(SocialAccount)
        private accountRepo: Repository<SocialAccount>,
    ) {
        super();
    }

    async process(job: Job<{ postId: string; platform: string }>): Promise<void> {
        const { postId } = job.data;
        this.logger.log(`Processing social post job: ${postId}`);

        const post = await this.postRepo.findOne({ where: { id: postId } });
        if (!post) {
            this.logger.error(`Post not found: ${postId}`);
            return;
        }

        const account = await this.accountRepo.findOne({
            where: { id: post.socialAccountId, isActive: true },
        });
        if (!account) {
            post.status = PostStatus.FAILED;
            post.errorMessage = 'Associated social account not found or disconnected';
            await this.postRepo.save(post);
            return;
        }

        try {
            switch (post.platform) {
                case SocialPlatform.FACEBOOK:
                    await this.publishToFacebook(post, account);
                    break;
                case SocialPlatform.INSTAGRAM:
                    await this.publishToInstagram(post, account);
                    break;
                case SocialPlatform.LINKEDIN:
                    await this.publishToLinkedin(post, account);
                    break;
                default:
                    throw new Error(`Unknown platform: ${post.platform}`);
            }

            post.status = PostStatus.POSTED;
            await this.postRepo.save(post);
            this.logger.log(`✅ ${post.platform} post ${postId} published successfully!`);
        } catch (error: any) {
            const errorMsg = error.response?.data?.error?.message || error.message;
            this.logger.error(`❌ Failed to publish ${post.platform} post ${postId}: ${errorMsg}`);
            post.status = PostStatus.FAILED;
            post.errorMessage = errorMsg;
            await this.postRepo.save(post);
            throw error;
        }
    }

    // ─── FACEBOOK PUBLISHING ───────────────────────────────────────────

    private async publishToFacebook(post: SocialPost, account: SocialAccount): Promise<void> {
        const baseUrl = 'https://graph.facebook.com/v18.0';

        let fbUrl: string;
        const fbParams: Record<string, string> = {
            access_token: account.accessToken,
            message: post.caption,
        };

        if (post.mediaType === 'IMAGE') {
            fbUrl = `${baseUrl}/${account.pageId}/photos`;
            fbParams.url = post.mediaUrl;
        } else if (post.mediaType === 'VIDEO' || post.mediaType === 'REELS') {
            fbUrl = `${baseUrl}/${account.pageId}/videos`;
            fbParams.file_url = post.mediaUrl;
            fbParams.description = post.caption;
        } else {
            fbUrl = `${baseUrl}/${account.pageId}/feed`;
        }

        const res = await axios.post(fbUrl, null, { params: fbParams });
        post.platformPostId = res.data.id || res.data.post_id;
        this.logger.log(`Facebook post created: ${post.platformPostId}`);
    }

    // ─── INSTAGRAM PUBLISHING ──────────────────────────────────────────

    private async publishToInstagram(post: SocialPost, account: SocialAccount): Promise<void> {
        // Instagram via native login uses graph.instagram.com
        // Instagram via Facebook login uses graph.facebook.com
        const useFbGraph = !!account.pageId;
        const baseUrl = useFbGraph
            ? 'https://graph.facebook.com/v18.0'
            : 'https://graph.instagram.com/v18.0';
        const accountId = useFbGraph ? account.platformId : account.platformId;

        // Step 1: Create media container
        this.logger.log(`Creating Instagram media container for post ${post.id}...`);
        const containerUrl = `${baseUrl}/${accountId}/media`;
        const containerParams: Record<string, string> = {
            access_token: account.accessToken,
            caption: post.caption,
        };

        if (post.mediaType === 'VIDEO' || post.mediaType === 'REELS') {
            containerParams.video_url = post.mediaUrl;
            containerParams.media_type = post.mediaType;
        } else {
            containerParams.image_url = post.mediaUrl;
        }

        const containerRes = await axios.post(containerUrl, null, { params: containerParams });
        const creationId = containerRes.data.id;
        this.logger.log(`Container created: ${creationId}. Polling status...`);

        // Step 2: Poll until FINISHED
        let isReady = false;
        let attempts = 0;
        const maxAttempts = 20;

        while (!isReady && attempts < maxAttempts) {
            attempts++;
            const statusRes = await axios.get(`${baseUrl}/${creationId}`, {
                params: { fields: 'status_code,status', access_token: account.accessToken },
            });

            const statusCode = statusRes.data.status_code;
            this.logger.log(`Poll attempt ${attempts}: status = ${statusCode}`);

            if (statusCode === 'FINISHED') {
                isReady = true;
            } else if (statusCode === 'ERROR') {
                throw new Error(`Media container failed: ${statusRes.data.status || 'Unknown'}`);
            } else {
                await new Promise(r => setTimeout(r, 6000));
            }
        }

        if (!isReady) throw new Error('Media container processing timed out');

        // Step 3: Publish
        const publishRes = await axios.post(`${baseUrl}/${accountId}/media_publish`, null, {
            params: { access_token: account.accessToken, creation_id: creationId },
        });

        post.platformPostId = publishRes.data.id;
        this.logger.log(`Instagram post published: ${post.platformPostId}`);
    }

    // ─── LINKEDIN PUBLISHING ───────────────────────────────────────────

    private async publishToLinkedin(post: SocialPost, account: SocialAccount): Promise<void> {
        const authHeaders = {
            Authorization: `Bearer ${account.accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
        };

        let mediaAssets: any[] = [];
        let shareMediaCategory = 'NONE';

        // If there's a media URL, download the image and upload natively to LinkedIn
        if (post.mediaUrl) {
            this.logger.log(`Downloading image from ${post.mediaUrl}...`);
            const imageRes = await axios.get(post.mediaUrl, { responseType: 'arraybuffer' });
            const imageBuffer = imageRes.data;

            // Register upload
            this.logger.log('Registering image upload with LinkedIn...');
            const registerRes = await axios.post(
                'https://api.linkedin.com/v2/assets?action=registerUpload',
                {
                    registerUploadRequest: {
                        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
                        owner: `urn:li:person:${account.platformId}`,
                        serviceRelationships: [
                            {
                                relationshipType: 'OWNER',
                                identifier: 'urn:li:userGeneratedContent',
                            },
                        ],
                    },
                },
                { headers: { ...authHeaders, 'Content-Type': 'application/json' } },
            );

            const uploadUrl =
                registerRes.data.value.uploadMechanism[
                    'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
                ].uploadUrl;
            const assetUrn = registerRes.data.value.asset;

            // Upload binary image
            this.logger.log('Uploading binary image to LinkedIn...');
            await axios.put(uploadUrl, imageBuffer, {
                headers: {
                    Authorization: `Bearer ${account.accessToken}`,
                    'Content-Type': 'application/octet-stream',
                },
            });

            this.logger.log(`Image uploaded! URN: ${assetUrn}`);
            shareMediaCategory = 'IMAGE';
            mediaAssets = [
                {
                    status: 'READY',
                    media: assetUrn,
                    title: { text: 'Uploaded Image' },
                },
            ];
        }

        // Create UGC Post
        this.logger.log('Creating LinkedIn UGC post...');
        const postBody = {
            author: `urn:li:person:${account.platformId}`,
            lifecycleState: 'PUBLISHED',
            specificContent: {
                'com.linkedin.ugc.ShareContent': {
                    shareCommentary: { text: post.caption },
                    shareMediaCategory,
                    media: mediaAssets,
                },
            },
            visibility: {
                'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
            },
        };

        const publishRes = await axios.post(
            'https://api.linkedin.com/v2/ugcPosts',
            postBody,
            { headers: { ...authHeaders, 'Content-Type': 'application/json' } },
        );

        post.platformPostId = publishRes.data.id;
        this.logger.log(`LinkedIn post published: ${post.platformPostId}`);
    }
}
