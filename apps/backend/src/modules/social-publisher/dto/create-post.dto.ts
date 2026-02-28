import { IsString, IsEnum, IsOptional, IsDateString, IsNotEmpty } from 'class-validator';
import { MediaType } from '../entities/social-post.entity';
import { SocialPlatform } from '../entities/social-account.entity';

export class CreatePostDto {
    @IsString()
    @IsNotEmpty()
    socialAccountId: string;

    @IsEnum(SocialPlatform)
    platform: SocialPlatform;

    @IsString()
    @IsNotEmpty()
    caption: string;

    @IsString()
    @IsNotEmpty()
    mediaUrl: string;

    @IsEnum(MediaType)
    @IsOptional()
    mediaType?: MediaType;

    @IsDateString()
    scheduledAt: string;
}
