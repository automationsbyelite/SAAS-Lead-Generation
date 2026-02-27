import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { LeadSource } from '@shared/enums/lead-source.enum';
import { LeadStatus } from '@shared/enums/lead-status.enum';

@Entity('leads')
@Index(['tenantId'])
@Index(['tenantId', 'status'])
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column({ nullable: true })
  category: string | null;

  @Column({ nullable: true })
  companyName: string | null;

  @Column({ nullable: true })
  contactName: string | null;

  @Column({ nullable: true })
  phone: string | null;

  @Column({ nullable: true })
  email: string | null;

  @Column({ nullable: true })
  website: string | null;

  @Column({ nullable: true })
  facebook: string | null;

  @Column({ nullable: true })
  linkedin: string | null;

  @Column({ nullable: true })
  instagram: string | null;

  @Column({
    type: 'enum',
    enum: LeadSource,
  })
  source: LeadSource;

  @Column({
    type: 'enum',
    enum: LeadStatus,
    default: LeadStatus.NEW,
  })
  status: LeadStatus;

  @Column({ type: 'jsonb', nullable: true })
  rawData: Record<string, any> | null;

  @Column({ nullable: true })
  lastContactedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  deletedAt: Date | null;
}
