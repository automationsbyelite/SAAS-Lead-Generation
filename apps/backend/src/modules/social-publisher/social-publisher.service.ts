import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { SocialPost, PostStatus, MediaType } from './entities/social-post.entity';
import { SocialAccount } from './entities/social-account.entity';
import { CreatePostDto } from './dto/create-post.dto';

@Injectable()
export class SocialPublisherService {
    private readonly logger = new Logger(SocialPublisherService.name);

    constructor(
        @InjectRepository(SocialPost)
        private postRepo: Repository<SocialPost>,
        @InjectRepository(SocialAccount)
        private accountRepo: Repository<SocialAccount>,
        @InjectQueue('social-publisher')
        private publisherQueue: Queue,
    ) { }

    async createPost(tenantId: string, userId: string, dto: CreatePostDto): Promise<SocialPost> {
        // Verify the account belongs to this user/tenant
        const account = await this.accountRepo.findOne({
            where: { id: dto.socialAccountId, tenantId, userId, isActive: true },
        });

        if (!account) {
            throw new NotFoundException('Social account not found or not connected.');
        }

        // Block personal profile posts on Facebook
        if (account.username.includes('(Personal Profile)')) {
            throw new BadRequestException(
                'Facebook does not allow third-party apps to post to Personal Profiles. Please connect a Facebook Page.',
            );
        }

        const post = this.postRepo.create({
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

        const savedPost = await this.postRepo.save(post);

        // Calculate delay for scheduled posting
        const delay = Math.max(0, new Date(dto.scheduledAt).getTime() - Date.now());

        await this.publisherQueue.add(
            'publish-social-post',
            { postId: savedPost.id, platform: dto.platform },
            { jobId: savedPost.id, delay, removeOnComplete: true, removeOnFail: false },
        );

        this.logger.log(`Scheduled ${dto.platform} post ${savedPost.id} for tenant ${tenantId} (delay: ${Math.round(delay / 1000)}s)`);
        return savedPost;
    }

    async getPosts(
        tenantId: string,
        userId: string,
        filters?: { platform?: string; status?: string },
    ): Promise<{ data: SocialPost[]; total: number }> {
        const where: any = { tenantId, userId };
        if (filters?.platform) where.platform = filters.platform;
        if (filters?.status) where.status = filters.status;

        const [data, total] = await this.postRepo.findAndCount({
            where,
            relations: ['socialAccount'],
            order: { scheduledAt: 'DESC' },
        });

        return { data, total };
    }

    async deletePost(tenantId: string, userId: string, postId: string): Promise<void> {
        const post = await this.postRepo.findOne({
            where: { id: postId, tenantId, userId },
        });

        if (!post) throw new NotFoundException('Post not found');
        if (post.status === PostStatus.POSTED) {
            throw new BadRequestException('Cannot delete an already published post.');
        }

        await this.postRepo.remove(post);
        // Attempt to remove job from queue
        await this.publisherQueue.remove(postId);
        this.logger.log(`Deleted post ${postId} for tenant ${tenantId}`);
    }

    async reschedulePost(tenantId: string, userId: string, postId: string, newDate: Date): Promise<SocialPost> {
        const post = await this.postRepo.findOne({
            where: { id: postId, tenantId, userId },
        });

        if (!post) throw new NotFoundException('Post not found');
        if (post.status === PostStatus.POSTED) {
            throw new BadRequestException('Cannot reschedule an already published post.');
        }

        post.scheduledAt = newDate;
        const savedPost = await this.postRepo.save(post);

        const delay = Math.max(0, newDate.getTime() - Date.now());

        try {
            // Remove existing job
            await this.publisherQueue.remove(postId);
        } catch (e) {
            this.logger.warn(`Failed to remove old queue job for post ${postId}`);
        }

        // Re-queue with new date
        await this.publisherQueue.add(
            'publish-social-post',
            { postId: savedPost.id, platform: savedPost.platform },
            { jobId: savedPost.id, delay, removeOnComplete: true, removeOnFail: false },
        );

        this.logger.log(`Rescheduled post ${postId} to ${newDate.toISOString()} (delay: ${Math.round(delay / 1000)}s)`);
        return savedPost;
    }
}
