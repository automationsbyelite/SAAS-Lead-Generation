import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

export enum SocialPlatform {
    FACEBOOK = 'facebook',
    INSTAGRAM = 'instagram',
    LINKEDIN = 'linkedin',
}

@Entity('social_accounts')
export class SocialAccount {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    tenantId: string;

    @Column('uuid')
    userId: string;

    @Column({ type: 'enum', enum: SocialPlatform })
    platform: SocialPlatform;

    @Column()
    platformId: string;

    @Column()
    username: string;

    @Column('text')
    accessToken: string;

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
