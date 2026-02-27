import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { CampaignModuleType } from '@shared/enums/campaign-module-type.enum';

@Entity('tenant_quotas')
@Unique(['tenantId', 'moduleType'])
@Index(['tenantId'])
export class TenantQuota {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column({
    type: 'enum',
    enum: CampaignModuleType,
  })
  moduleType: CampaignModuleType;

  @Column('integer')
  monthlyLimit: number;

  @Column('integer', { default: 0 })
  usedThisMonth: number;

  @Column('timestamp')
  resetAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
