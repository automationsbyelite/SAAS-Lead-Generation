import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Lead, LeadDocument } from './lead.entity';
import { LeadStatus } from '@shared/enums/lead-status.enum';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

@Injectable()
export class LeadsService {
  constructor(
    @InjectModel(Lead.name)
    private leadModel: Model<LeadDocument>,
  ) { }

  async createLead(tenantId: string, data: CreateLeadDto): Promise<Lead> {
    const created = new this.leadModel({
      tenantId,
      ...data,
      status: LeadStatus.NEW,
    });
    const saved = await created.save();
    return saved.toObject();
  }

  async createManyLeads(
    tenantId: string,
    leads: CreateLeadDto[],
  ): Promise<{ inserted: number; skippedDuplicates: number }> {
    const websites = leads.map(l => l.website).filter((w): w is string => Boolean(w));
    const phones = leads.map(l => l.phone).filter((p): p is string => Boolean(p));

    const orConditions: any[] = [];
    if (websites.length > 0) orConditions.push({ website: { $in: websites } });
    if (phones.length > 0) orConditions.push({ phone: { $in: phones } });

    const existingLeads = orConditions.length > 0
      ? await this.leadModel.find({ tenantId, deletedAt: null, $or: orConditions }).lean<Lead[]>()
      : [];

    const existingWebsites = new Set(existingLeads.map(l => l.website).filter((w): w is string => Boolean(w)));
    const existingPhones = new Set(existingLeads.map(l => l.phone).filter((p): p is string => Boolean(p)));

    const uniqueLeads: CreateLeadDto[] = [];
    let skippedDuplicates = 0;

    for (const lead of leads) {
      const hasWebsite = lead.website != null && lead.website !== '';
      const hasPhone = lead.phone != null && lead.phone !== '';

      if (!hasWebsite && !hasPhone) { uniqueLeads.push(lead); continue; }

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

    if (uniqueLeads.length === 0) return { inserted: 0, skippedDuplicates };

    const docs = uniqueLeads.map(lead => ({ tenantId, ...lead, status: LeadStatus.NEW }));
    await this.leadModel.insertMany(docs);

    return { inserted: uniqueLeads.length, skippedDuplicates };
  }

  async getLeads(
    tenantId: string,
    filters?: { status?: LeadStatus; page?: number; limit?: number },
  ): Promise<{ data: Lead[]; total: number; page: number; limit: number }> {
    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 50, 100);
    const skip = (page - 1) * limit;

    const query: any = { tenantId, deletedAt: null };
    if (filters?.status) query.status = filters.status;

    const [data, total] = await Promise.all([
      this.leadModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<Lead[]>(),
      this.leadModel.countDocuments(query),
    ]);

    return { data, total, page, limit };
  }

  async updateLeadStatus(tenantId: string, leadId: string, status: LeadStatus): Promise<Lead> {
    const update: any = { status };
    if (status === LeadStatus.CONTACTED) update.lastContactedAt = new Date();

    const lead = await this.leadModel.findOneAndUpdate(
      { _id: leadId, tenantId, deletedAt: null },
      update,
      { new: true },
    ).lean<Lead>();

    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async updateLead(tenantId: string, leadId: string, data: UpdateLeadDto): Promise<Lead> {
    const lead = await this.leadModel.findOneAndUpdate(
      { _id: leadId, tenantId, deletedAt: null },
      { $set: data },
      { new: true },
    ).lean<Lead>();

    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async softDeleteLead(tenantId: string, leadId: string): Promise<void> {
    const result = await this.leadModel.findOneAndUpdate(
      { _id: leadId, tenantId, deletedAt: null },
      { deletedAt: new Date() },
    );

    if (!result) throw new NotFoundException('Lead not found');
  }
}
