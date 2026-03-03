import { IsString, IsOptional } from 'class-validator';

export class UpdateLeadDto {
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
}
