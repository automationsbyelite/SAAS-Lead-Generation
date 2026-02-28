import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

export enum SocialPlatform {
    FACEBOOK = 'facebook',
    INSTAGRAM = 'instagram',
    LINKEDIN = 'linkedin',
}

@Entity('social_accounts')
@Index(['tenantId', 'platform'])
@Index(['tenantId', 'userId'])
export class SocialAccount {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    tenantId: string;

    @Column('uuid')
    userId: string;

    @Column({
        type: 'enum',
        enum: SocialPlatform,
    })
    platform: SocialPlatform;

    /** Platform-specific user/page ID (e.g. Facebook Page ID, Instagram User ID) */
    @Column()
    platformId: string;

    /** Display name (page name, IG username, etc.) */
    @Column()
    username: string;

    /** OAuth access token — long-lived */
    @Column('text')
    accessToken: string;

    /** Facebook Page ID — needed for FB posting and IG via FB */
    @Column({ nullable: true })
    pageId: string;

    @Column({ nullable: true })
    profilePicture: string;

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
