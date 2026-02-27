import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { CampaignItemStatus } from '@shared/enums/campaign-item-status.enum';

@Entity('campaign_items')
@Unique(['campaignId', 'leadId'])
@Index(['tenantId', 'campaignId'])
@Index(['tenantId', 'status'])
@Index(['campaignId'])
@Index(['leadId'])
export class CampaignItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  campaignId: string;

  @Column('uuid')
  leadId: string;

  @Column({
    type: 'enum',
    enum: CampaignItemStatus,
    default: CampaignItemStatus.PENDING,
  })
  status: CampaignItemStatus;

  @Column({ default: 0 })
  attemptCount: number;

  @Column({ nullable: true })
  externalRefId: string | null;

  @Column({ nullable: true })
  lastAttemptAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
