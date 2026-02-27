import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { CampaignModuleType } from '@shared/enums/campaign-module-type.enum';
import { CampaignStatus } from '@shared/enums/campaign-status.enum';

@Entity('campaigns')
@Index(['tenantId'])
@Index(['tenantId', 'status'])
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  customPrompt?: string;

  @Column({ type: 'jsonb', nullable: true })
  emailConfig?: Record<string, any>;

  @Column({
    type: 'enum',
    enum: CampaignModuleType,
  })
  moduleType: CampaignModuleType;

  @Column({
    type: 'enum',
    enum: CampaignStatus,
    default: CampaignStatus.DRAFT,
  })
  status: CampaignStatus;

  @Column({ default: 0 })
  totalItems: number;

  @Column({ default: 0 })
  processedItems: number;

  @Column({ default: 0 })
  successCount: number;

  @Column({ default: 0 })
  failureCount: number;

  @Column('uuid')
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;
}
