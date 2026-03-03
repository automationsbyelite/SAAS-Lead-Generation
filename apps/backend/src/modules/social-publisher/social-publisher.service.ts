import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Model } from 'mongoose';
import { SocialPost, SocialPostDocument, PostStatus, MediaType } from './entities/social-post.entity';
import { SocialAccount, SocialAccountDocument } from './entities/social-account.entity';
import { CreatePostDto } from './dto/create-post.dto';

@Injectable()
export class SocialPublisherService {
    private readonly logger = new Logger(SocialPublisherService.name);

    constructor(
        @InjectModel(SocialPost.name)
        private postModel: Model<SocialPostDocument>,
        @InjectModel(SocialAccount.name)
        private accountModel: Model<SocialAccountDocument>,
        @InjectQueue('social-publisher')
        private publisherQueue: Queue,
    ) { }

    async createPost(tenantId: string, userId: string, dto: CreatePostDto): Promise<SocialPost> {
        const account = await this.accountModel
            .findOne({ _id: dto.socialAccountId, tenantId, userId, isActive: true })
            .lean<SocialAccount>();

        if (!account) throw new NotFoundException('Social account not found or not connected.');

        if (account.username.includes('(Personal Profile)')) {
            throw new BadRequestException(
                'Facebook does not allow third-party apps to post to Personal Profiles. Please connect a Facebook Page.',
            );
        }

        const post = new this.postModel({
            tenantId,
            userId,
            socialAccountId: dto.socialAccountId,
            platform: dto.platform,
            caption: dto.caption,
            mediaUrl: dto.mediaUrl,
            mediaType: dto.mediaType || MediaType.IMAGE,
            scheduledAt: new Date(dto.scheduledAt),
            status: PostStatus.SCHEDULED,
        });

        const savedPost = await post.save();

        const delay = Math.max(0, new Date(dto.scheduledAt).getTime() - Date.now());
        await this.publisherQueue.add(
            'publish-social-post',
            { postId: savedPost._id, platform: dto.platform },
            { jobId: savedPost._id, delay, removeOnComplete: true, removeOnFail: false },
        );

        this.logger.log(`Scheduled ${dto.platform} post ${savedPost._id} for tenant ${tenantId} (delay: ${Math.round(delay / 1000)}s)`);
        return savedPost.toObject();
    }

    async getPosts(
        tenantId: string,
        userId: string,
        filters?: { platform?: string; status?: string },
    ): Promise<{ data: SocialPost[]; total: number }> {
        const query: any = { tenantId, userId };
        if (filters?.platform) query.platform = filters.platform;
        if (filters?.status) query.status = filters.status;

        const data = await this.postModel.find(query).sort({ scheduledAt: -1 }).lean<SocialPost[]>();
        // Manually populate socialAccount reference
        const accounts = await this.accountModel
            .find({ _id: { $in: data.map(p => (p as any).socialAccountId) } })
            .lean<SocialAccount[]>();
        const accountMap = new Map(accounts.map(a => [a._id as string, a]));
        const enriched = data.map(p => ({ ...p, socialAccount: accountMap.get((p as any).socialAccountId) }));

        return { data: enriched as any, total: enriched.length };
    }

    async deletePost(tenantId: string, userId: string, postId: string): Promise<void> {
        const post = await this.postModel.findOne({ _id: postId, tenantId, userId }).lean<SocialPost>();
        if (!post) throw new NotFoundException('Post not found');
        if ((post as any).status === PostStatus.POSTED) {
            throw new BadRequestException('Cannot delete an already published post.');
        }

        await this.postModel.findByIdAndDelete(postId);
        await this.publisherQueue.remove(postId);
        this.logger.log(`Deleted post ${postId} for tenant ${tenantId}`);
    }

    async reschedulePost(tenantId: string, userId: string, postId: string, newDate: Date): Promise<SocialPost> {
        const post = await this.postModel.findOne({ _id: postId, tenantId, userId }).lean<SocialPost>();
        if (!post) throw new NotFoundException('Post not found');
        if ((post as any).status === PostStatus.POSTED) {
            throw new BadRequestException('Cannot reschedule an already published post.');
        }

        const savedPost = await this.postModel
            .findByIdAndUpdate(postId, { scheduledAt: newDate }, { new: true })
            .lean<SocialPost>();

        const delay = Math.max(0, newDate.getTime() - Date.now());
        try { await this.publisherQueue.remove(postId); } catch (e) {
            this.logger.warn(`Failed to remove old queue job for post ${postId}`);
        }

        await this.publisherQueue.add(
            'publish-social-post',
            { postId, platform: (post as any).platform },
            { jobId: postId, delay, removeOnComplete: true, removeOnFail: false },
        );

        this.logger.log(`Rescheduled post ${postId} to ${newDate.toISOString()}`);
        return savedPost!;
    }
}
