import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';
import { LeadSource } from '@shared/enums/lead-source.enum';

export class CreateLeadDto {
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  facebook?: string;

  @IsOptional()
  @IsString()
  linkedin?: string;

  @IsOptional()
  @IsString()
  instagram?: string;

  @IsEnum(LeadSource)
  source: LeadSource;

  @IsOptional()
  @IsObject()
  rawData?: Record<string, any>;
}
