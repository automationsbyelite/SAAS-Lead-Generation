import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job } from 'bullmq';
import axios from 'axios';
import { SocialPost, SocialPostDocument, PostStatus } from '../entities/social-post.entity';
import { SocialAccount, SocialAccountDocument, SocialPlatform } from '../entities/social-account.entity';

@Processor('social-publisher')
export class SocialPublisherProcessor extends WorkerHost {
    private readonly logger = new Logger(SocialPublisherProcessor.name);

    constructor(
        @InjectModel(SocialPost.name)
        private postModel: Model<SocialPostDocument>,
        @InjectModel(SocialAccount.name)
        private accountModel: Model<SocialAccountDocument>,
    ) {
        super();
    }

    async process(job: Job<{ postId: string; platform: string }>): Promise<void> {
        const { postId } = job.data;
        this.logger.log(`Processing social post job: ${postId}`);

        const post = await this.postModel.findById(postId).lean<SocialPost>();
        if (!post) {
            this.logger.error(`Post not found: ${postId}`);
            return;
        }

        const account = await this.accountModel
            .findOne({ _id: (post as any).socialAccountId, isActive: true })
            .lean<SocialAccount>();

        if (!account) {
            await this.postModel.findByIdAndUpdate(postId, {
                status: PostStatus.FAILED,
                errorMessage: 'Associated social account not found or disconnected',
            });
            return;
        }

        try {
            let platformPostId: string | undefined;

            switch ((post as any).platform) {
                case SocialPlatform.FACEBOOK:
                    platformPostId = await this.publishToFacebook(post, account);
                    break;
                case SocialPlatform.INSTAGRAM:
                    platformPostId = await this.publishToInstagram(post, account);
                    break;
                case SocialPlatform.LINKEDIN:
                    platformPostId = await this.publishToLinkedin(post, account);
                    break;
                default:
                    throw new Error(`Unknown platform: ${(post as any).platform}`);
            }

            await this.postModel.findByIdAndUpdate(postId, {
                status: PostStatus.POSTED,
                platformPostId,
            });
            this.logger.log(`✅ ${(post as any).platform} post ${postId} published successfully!`);
        } catch (error: any) {
            const errorMsg = error.response?.data?.error?.message || error.message;
            this.logger.error(`❌ Failed to publish post ${postId}: ${errorMsg}`);
            await this.postModel.findByIdAndUpdate(postId, {
                status: PostStatus.FAILED,
                errorMessage: errorMsg,
            });
            throw error;
        }
    }

    private async publishToFacebook(post: SocialPost, account: SocialAccount): Promise<string> {
        const baseUrl = 'https://graph.facebook.com/v18.0';
        let fbUrl: string;
        const fbParams: Record<string, string> = {
            access_token: account.accessToken,
            message: (post as any).caption,
        };

        if ((post as any).mediaType === 'IMAGE') {
            fbUrl = `${baseUrl}/${account.pageId}/photos`;
            fbParams.url = (post as any).mediaUrl;
        } else if ((post as any).mediaType === 'VIDEO' || (post as any).mediaType === 'REELS') {
            fbUrl = `${baseUrl}/${account.pageId}/videos`;
            fbParams.file_url = (post as any).mediaUrl;
            fbParams.description = (post as any).caption;
        } else {
            fbUrl = `${baseUrl}/${account.pageId}/feed`;
        }

        const res = await axios.post(fbUrl, null, { params: fbParams });
        const id = res.data.id || res.data.post_id;
        this.logger.log(`Facebook post created: ${id}`);
        return id;
    }

    private async publishToInstagram(post: SocialPost, account: SocialAccount): Promise<string> {
        const useFbGraph = !!account.pageId;
        const baseUrl = useFbGraph ? 'https://graph.facebook.com/v18.0' : 'https://graph.instagram.com/v18.0';
        const accountId = account.platformId;

        this.logger.log(`Creating Instagram media container for post...`);
        const containerParams: Record<string, string> = {
            access_token: account.accessToken,
            caption: (post as any).caption,
        };

        if ((post as any).mediaType === 'VIDEO' || (post as any).mediaType === 'REELS') {
            containerParams.video_url = (post as any).mediaUrl;
            containerParams.media_type = (post as any).mediaType;
        } else {
            containerParams.image_url = (post as any).mediaUrl;
        }

        const containerRes = await axios.post(`${baseUrl}/${accountId}/media`, null, { params: containerParams });
        const creationId = containerRes.data.id;
        this.logger.log(`Container created: ${creationId}. Polling status...`);

        let isReady = false;
        let attempts = 0;
        while (!isReady && attempts < 20) {
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

        const publishRes = await axios.post(`${baseUrl}/${accountId}/media_publish`, null, {
            params: { access_token: account.accessToken, creation_id: creationId },
        });
        this.logger.log(`Instagram post published: ${publishRes.data.id}`);
        return publishRes.data.id;
    }

    private async publishToLinkedin(post: SocialPost, account: SocialAccount): Promise<string> {
        const authHeaders = {
            Authorization: `Bearer ${account.accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
        };

        let mediaAssets: any[] = [];
        let shareMediaCategory = 'NONE';

        if ((post as any).mediaUrl) {
            this.logger.log(`Downloading image from ${(post as any).mediaUrl}...`);
            const imageRes = await axios.get((post as any).mediaUrl, { responseType: 'arraybuffer' });

            const registerRes = await axios.post(
                'https://api.linkedin.com/v2/assets?action=registerUpload',
                {
                    registerUploadRequest: {
                        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
                        owner: `urn:li:person:${account.platformId}`,
                        serviceRelationships: [{ relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' }],
                    },
                },
                { headers: { ...authHeaders, 'Content-Type': 'application/json' } },
            );

            const uploadUrl = registerRes.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
            const assetUrn = registerRes.data.value.asset;

            await axios.put(uploadUrl, imageRes.data, {
                headers: { Authorization: `Bearer ${account.accessToken}`, 'Content-Type': 'application/octet-stream' },
            });

            this.logger.log(`Image uploaded! URN: ${assetUrn}`);
            shareMediaCategory = 'IMAGE';
            mediaAssets = [{ status: 'READY', media: assetUrn, title: { text: 'Uploaded Image' } }];
        }

        const postBody = {
            author: `urn:li:person:${account.platformId}`,
            lifecycleState: 'PUBLISHED',
            specificContent: {
                'com.linkedin.ugc.ShareContent': {
                    shareCommentary: { text: (post as any).caption },
                    shareMediaCategory,
                    media: mediaAssets,
                },
            },
            visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
        };

        const publishRes = await axios.post('https://api.linkedin.com/v2/ugcPosts', postBody, {
            headers: { ...authHeaders, 'Content-Type': 'application/json' },
        });

        this.logger.log(`LinkedIn post published: ${publishRes.data.id}`);
        return publishRes.data.id;
    }
}
