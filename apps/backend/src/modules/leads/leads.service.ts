import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { Lead } from './lead.entity';
import { LeadStatus } from '@shared/enums/lead-status.enum';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private leadRepository: Repository<Lead>,
  ) { }

  async createLead(tenantId: string, data: CreateLeadDto): Promise<Lead> {
    const lead = this.leadRepository.create({
      tenantId,
      ...data,
      status: LeadStatus.NEW,
    });
    return this.leadRepository.save(lead);
  }

  async createManyLeads(
    tenantId: string,
    leads: CreateLeadDto[],
  ): Promise<{ inserted: number; skippedDuplicates: number }> {
    const websites = leads.map(l => l.website).filter((w): w is string => Boolean(w));
    const phones = leads.map(l => l.phone).filter((p): p is string => Boolean(p));

    const whereConditions: any[] = [];
    if (websites.length > 0) {
      whereConditions.push({ tenantId, deletedAt: IsNull(), website: In(websites) });
    }
    if (phones.length > 0) {
      whereConditions.push({ tenantId, deletedAt: IsNull(), phone: In(phones) });
    }

    const existingLeads = whereConditions.length > 0
      ? await this.leadRepository.find({ where: whereConditions })
      : [];

    const existingWebsites = new Set(
      existingLeads.map(l => l.website).filter((w): w is string => Boolean(w)),
    );
    const existingPhones = new Set(
      existingLeads.map(l => l.phone).filter((p): p is string => Boolean(p)),
    );

    const uniqueLeads: CreateLeadDto[] = [];
    let skippedDuplicates = 0;

    for (const lead of leads) {
      const hasWebsite = lead.website != null && lead.website !== '';
      const hasPhone = lead.phone != null && lead.phone !== '';

      if (!hasWebsite && !hasPhone) {
        uniqueLeads.push(lead);
        continue;
      }

      const isDuplicate =
        (hasWebsite && existingWebsites.has(lead.website!)) ||
        (hasPhone && existingPhones.has(lead.phone!));

      if (isDuplicate) {
        skippedDuplicates++;
      } else {
        uniqueLeads.push(lead);
        if (hasWebsite) existingWebsites.add(lead.website!);
        if (hasPhone) existingPhones.add(lead.phone!);
      }
    }

    if (uniqueLeads.length === 0) {
      return { inserted: 0, skippedDuplicates };
    }

    const newLeads = uniqueLeads.map(lead =>
      this.leadRepository.create({
        tenantId,
        ...lead,
        status: LeadStatus.NEW,
      }),
    );

    await this.leadRepository.save(newLeads);

    return { inserted: newLeads.length, skippedDuplicates };
  }

  async getLeads(
    tenantId: string,
    filters?: { status?: LeadStatus; page?: number; limit?: number },
  ): Promise<{ data: Lead[]; total: number; page: number; limit: number }> {
    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 50, 100);
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      deletedAt: IsNull(),
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    const [data, total] = await this.leadRepository.findAndCount({
      where,
      order: {
        createdAt: 'DESC',
      },
      skip,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async updateLeadStatus(tenantId: string, leadId: string, status: LeadStatus): Promise<Lead> {
    const lead = await this.leadRepository.findOne({
      where: { id: leadId, tenantId, deletedAt: IsNull() },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    lead.status = status;
    if (status === LeadStatus.CONTACTED) {
      lead.lastContactedAt = new Date();
    }

    return this.leadRepository.save(lead);
  }

  async updateLead(tenantId: string, leadId: string, data: UpdateLeadDto): Promise<Lead> {
    const lead = await this.leadRepository.findOne({
      where: { id: leadId, tenantId, deletedAt: IsNull() },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    Object.assign(lead, data);
    return this.leadRepository.save(lead);
  }

  async softDeleteLead(tenantId: string, leadId: string): Promise<void> {
    const lead = await this.leadRepository.findOne({
      where: { id: leadId, tenantId, deletedAt: IsNull() },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    lead.deletedAt = new Date();
    await this.leadRepository.save(lead);
  }
}
