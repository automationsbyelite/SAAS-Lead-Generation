import { IsString, IsArray, IsEnum, IsUUID, ArrayMinSize, IsOptional, ValidateNested, IsObject } from 'class-validator';
import { CampaignModuleType } from '@shared/enums/campaign-module-type.enum';
import { Type } from 'class-transformer';

export class EmailConfigDto {
  @IsString()
  senderName: string;

  @IsString()
  senderRole: string;

  @IsString()
  senderCompany: string;

  @IsString()
  offering: string;

  @IsString()
  painPoint: string;

  @IsString()
  ctaText: string;

  @IsString()
  @IsOptional()
  ctaLink?: string;

  @IsString()
  tone: string; // PROFESSIONAL | FRIENDLY | CASUAL
}

export class CreateCampaignDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  customPrompt?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => EmailConfigDto)
  emailConfig?: EmailConfigDto;

  @IsEnum(CampaignModuleType)
  moduleType: CampaignModuleType;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  leadIds: string[];
}
