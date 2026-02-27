import { IsString, IsEnum, IsOptional } from 'class-validator';

export enum VapiCallStatus {
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export class VapiWebhookDto {
  @IsString()
  callId: string;

  @IsEnum(VapiCallStatus)
  status: VapiCallStatus;

  @IsOptional()
  @IsString()
  transcript?: string;

  @IsOptional()
  @IsString()
  outcome?: string;
}
