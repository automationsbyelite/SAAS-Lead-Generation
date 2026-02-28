import { Injectable, NotFoundException, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SocialAccount, SocialPlatform } from './entities/social-account.entity';
import { TenantService } from '../tenant/tenant.service';
import { CampaignModuleType } from '@shared/enums/campaign-module-type.enum';
import { Role } from '@shared/enums/role.enum';
import axios from 'axios';

@Injectable()
export class SocialAccountService {
    private readonly logger = new Logger(SocialAccountService.name);

    constructor(
        @InjectRepository(SocialAccount)
        private socialAccountRepo: Repository<SocialAccount>,
        private tenantService: TenantService,
    ) { }

    /**
     * Check if a tenant has purchased the Social Publisher module.
     */
    async ensureModuleAccess(tenantId: string, userRole?: string): Promise<void> {
        // Super admins always have access to all modules
        if (userRole === Role.SUPER_ADMIN) return;

        const tenant = await this.tenantService.findById(tenantId);
        if (!tenant) throw new NotFoundException('Tenant not found');

        if (!tenant.enabledModules?.includes(CampaignModuleType.SOCIAL_PUBLISHER)) {
            throw new ForbiddenException(
                'Social Publisher module is not enabled. Purchase it from the Billing page.',
            );
        }
    }

    // ─── FACEBOOK OAUTH ────────────────────────────────────────────────

    getFacebookAuthUrl(tenantId: string, userId: string): string {
        const appId = process.env.FACEBOOK_APP_ID;
        const redirectUri = process.env.FACEBOOK_REDIRECT_URI;

        const scope = [
            'pages_read_engagement',
            'pages_show_list',
            'pages_manage_posts',
            'public_profile',
        ].join(',');

        const state = JSON.stringify({ tenantId, userId });

        return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri!)}&scope=${scope}&state=${encodeURIComponent(state)}&response_type=code&auth_type=rerequest`;
    }

    async handleFacebookCallback(code: string, state: string): Promise<{ tenantId: string; accountCount: number }> {
        const { tenantId, userId } = JSON.parse(state);

        const appId = process.env.FACEBOOK_APP_ID;
        const appSecret = process.env.FACEBOOK_APP_SECRET;
        const redirectUri = process.env.FACEBOOK_REDIRECT_URI;

        // 1. Code → short-lived token
        const tokenRes = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
            params: { client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code },
        });
        const shortLivedToken = tokenRes.data.access_token;

        // 2. Short-lived → long-lived token (~60 days)
        const longLivedRes = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
            params: {
                grant_type: 'fb_exchange_token',
                client_id: appId,
                client_secret: appSecret,
                fb_exchange_token: shortLivedToken,
            },
        });
        const accessToken = longLivedRes.data.access_token;

        // 3. Get user's pages (and linked Instagram business accounts)
        const pagesRes = await axios.get('https://graph.facebook.com/v18.0/me/accounts', {
            params: {
                access_token: accessToken,
                fields: 'id,name,access_token,picture{url},instagram_business_account{id,username,profile_picture_url}',
            },
        });

        const savedAccounts: SocialAccount[] = [];

        if (pagesRes.data.data?.length > 0) {
            for (const page of pagesRes.data.data) {
                // Save Facebook Page
                const fbAccount = await this.upsertAccount({
                    tenantId,
                    userId,
                    platform: SocialPlatform.FACEBOOK,
                    platformId: page.id,
                    username: page.name,
                    accessToken: page.access_token,
                    pageId: page.id,
                    profilePicture: page.picture?.data?.url || `https://graph.facebook.com/${page.id}/picture?type=large`,
                });
                savedAccounts.push(fbAccount);

                // Save linked Instagram Business account if it exists
                if (page.instagram_business_account) {
                    const ig = page.instagram_business_account;
                    const igAccount = await this.upsertAccount({
                        tenantId,
                        userId,
                        platform: SocialPlatform.INSTAGRAM,
                        platformId: ig.id,
                        username: ig.username,
                        accessToken: page.access_token, // IG via FB uses the Page token
                        pageId: page.id,
                        profilePicture: ig.profile_picture_url || '',
                    });
                    savedAccounts.push(igAccount);
                }
            }
        }

        // Fallback: save personal profile if no pages found
        if (savedAccounts.length === 0) {
            const profileRes = await axios.get('https://graph.facebook.com/v18.0/me', {
                params: { access_token: accessToken, fields: 'id,name,picture{url}' },
            });
            const profile = profileRes.data;
            const fallback = await this.upsertAccount({
                tenantId,
                userId,
                platform: SocialPlatform.FACEBOOK,
                platformId: profile.id,
                username: `${profile.name} (Personal Profile)`,
                accessToken,
                pageId: profile.id,
                profilePicture: profile.picture?.data?.url || '',
            });
            savedAccounts.push(fallback);
        }

        this.logger.log(`Facebook OAuth complete for tenant ${tenantId}. Saved ${savedAccounts.length} accounts.`);
        return { tenantId, accountCount: savedAccounts.length };
    }

    // ─── INSTAGRAM OAUTH (Native Instagram Login) ──────────────────────

    getInstagramAuthUrl(tenantId: string, userId: string): string {
        const appId = process.env.INSTAGRAM_APP_ID;
        const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;

        const scope = [
            'instagram_business_basic',
            'instagram_business_content_publish',
            'instagram_business_manage_comments',
            'instagram_business_manage_messages',
        ].join(',');

        const state = JSON.stringify({ tenantId, userId });

        return `https://www.instagram.com/oauth/authorize?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri!)}&scope=${scope}&state=${encodeURIComponent(state)}&response_type=code`;
    }

    async handleInstagramCallback(code: string, state: string): Promise<{ tenantId: string }> {
        const { tenantId, userId } = JSON.parse(state);

        const appId = process.env.INSTAGRAM_APP_ID;
        const appSecret = process.env.INSTAGRAM_APP_SECRET;
        const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;

        // 1. Code → short-lived token (POST to Instagram)
        const tokenRes = await axios.post(
            'https://api.instagram.com/oauth/access_token',
            new URLSearchParams({
                client_id: appId!,
                client_secret: appSecret!,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri!,
                code,
            }).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 },
        );
        const shortLivedToken = tokenRes.data.access_token;

        // 2. Short-lived → long-lived token
        const longLivedRes = await axios.get('https://graph.instagram.com/access_token', {
            params: { grant_type: 'ig_exchange_token', client_secret: appSecret, access_token: shortLivedToken },
            timeout: 15000,
        });
        const accessToken = longLivedRes.data.access_token;

        // 3. Get profile
        const profileRes = await axios.get('https://graph.instagram.com/me', {
            params: { fields: 'id,username,profile_picture_url', access_token: accessToken },
            timeout: 15000,
        });
        const profile = profileRes.data;

        // 4. Save account
        await this.upsertAccount({
            tenantId,
            userId,
            platform: SocialPlatform.INSTAGRAM,
            platformId: profile.id,
            username: profile.username,
            accessToken,
            pageId: '',
            profilePicture: profile.profile_picture_url || '',
        });

        this.logger.log(`Instagram OAuth complete for tenant ${tenantId}: @${profile.username}`);
        return { tenantId };
    }

    // ─── LINKEDIN OAUTH ────────────────────────────────────────────────

    getLinkedinAuthUrl(tenantId: string, userId: string): string {
        const clientId = process.env.LINKEDIN_CLIENT_ID;
        const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

        const scope = ['openid', 'profile', 'email', 'w_member_social'].join(' ');
        const state = JSON.stringify({ tenantId, userId });

        return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri!)}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent(scope)}`;
    }

    async handleLinkedinCallback(code: string, state: string): Promise<{ tenantId: string }> {
        const { tenantId, userId } = JSON.parse(state);

        const clientId = process.env.LINKEDIN_CLIENT_ID;
        const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
        const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

        // 1. Exchange code for access token
        const tokenRes = await axios.post(
            'https://www.linkedin.com/oauth/v2/accessToken',
            new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                client_id: clientId!,
                client_secret: clientSecret!,
                redirect_uri: redirectUri!,
            }).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
        );
        const accessToken = tokenRes.data.access_token;

        // 2. Get profile via OpenID userinfo
        const profileRes = await axios.get('https://api.linkedin.com/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        const profile = profileRes.data;

        // 3. Save account (sub = LinkedIn member ID)
        await this.upsertAccount({
            tenantId,
            userId,
            platform: SocialPlatform.LINKEDIN,
            platformId: profile.sub,
            username: profile.name,
            accessToken,
            pageId: '',
            profilePicture: profile.picture || '',
        });

        this.logger.log(`LinkedIn OAuth complete for tenant ${tenantId}: ${profile.name}`);
        return { tenantId };
    }

    // ─── ACCOUNT MANAGEMENT ────────────────────────────────────────────

    async getAccounts(tenantId: string, userId: string): Promise<SocialAccount[]> {
        return this.socialAccountRepo.find({
            where: { tenantId, userId, isActive: true },
            order: { createdAt: 'DESC' },
        });
    }

    async disconnectAccount(tenantId: string, userId: string, accountId: string): Promise<void> {
        const account = await this.socialAccountRepo.findOne({
            where: { id: accountId, tenantId, userId },
        });
        if (!account) throw new NotFoundException('Social account not found');

        account.isActive = false;
        await this.socialAccountRepo.save(account);
        this.logger.log(`Disconnected ${account.platform} account ${account.username} for tenant ${tenantId}`);
    }

    // ─── HELPERS ───────────────────────────────────────────────────────

    private async upsertAccount(data: {
        tenantId: string;
        userId: string;
        platform: SocialPlatform;
        platformId: string;
        username: string;
        accessToken: string;
        pageId: string;
        profilePicture: string;
    }): Promise<SocialAccount> {
        let account = await this.socialAccountRepo.findOne({
            where: { tenantId: data.tenantId, platformId: data.platformId, platform: data.platform },
        });

        if (account) {
            account.accessToken = data.accessToken;
            account.username = data.username;
            account.pageId = data.pageId;
            account.profilePicture = data.profilePicture;
            account.isActive = true;
            return this.socialAccountRepo.save(account);
        }

        account = this.socialAccountRepo.create(data);
        return this.socialAccountRepo.save(account);
    }
}
