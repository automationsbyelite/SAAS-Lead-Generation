import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { Campaign } from './campaign.entity';
import { Lead } from '../leads/lead.entity';
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

  @ManyToOne(() => Campaign)
  @JoinColumn({ name: 'campaignId' })
  campaign: Campaign;

  @Column('uuid')
  leadId: string;

  @ManyToOne(() => Lead)
  @JoinColumn({ name: 'leadId' })
  lead: Lead;

  @Column({
    type: 'enum',
    enum: CampaignItemStatus,
    default: CampaignItemStatus.PENDING,
  })
  status: CampaignItemStatus;

  @Column({ default: 0 })
  attemptCount: number;

  @Column({ type: 'varchar', nullable: true })
  externalRefId: string | null;

  @Column({ type: 'timestamp', nullable: true })
  lastAttemptAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
