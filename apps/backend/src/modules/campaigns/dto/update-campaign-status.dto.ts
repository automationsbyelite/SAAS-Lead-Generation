import { IsEnum } from 'class-validator';
import { CampaignStatus } from '@shared/enums/campaign-status.enum';

export class UpdateCampaignStatusDto {
  @IsEnum(CampaignStatus)
  status: CampaignStatus;
}
