import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { SocialAccount, SocialPlatform } from './social-account.entity';

export enum PostStatus {
    PENDING = 'pending',
    SCHEDULED = 'scheduled',
    POSTED = 'posted',
    FAILED = 'failed',
}

export enum MediaType {
    IMAGE = 'IMAGE',
    VIDEO = 'VIDEO',
    REELS = 'REELS',
}

@Entity('social_posts')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'userId'])
export class SocialPost {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    tenantId: string;

    @Column('uuid')
    userId: string;

    @Column('uuid')
    socialAccountId: string;

    @ManyToOne(() => SocialAccount, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'socialAccountId' })
    socialAccount: SocialAccount;

    @Column({
        type: 'enum',
        enum: SocialPlatform,
    })
    platform: SocialPlatform;

    @Column('text')
    caption: string;

    @Column('text')
    mediaUrl: string;

    @Column({
        type: 'enum',
        enum: MediaType,
        default: MediaType.IMAGE,
    })
    mediaType: MediaType;

    @Column('timestamp')
    scheduledAt: Date;

    @Column({
        type: 'enum',
        enum: PostStatus,
        default: PostStatus.PENDING,
    })
    status: PostStatus;

    /** Platform-returned post ID after successful publish */
    @Column({ nullable: true })
    platformPostId: string;

    @Column({ nullable: true, type: 'text' })
    errorMessage: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
