import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TenantService } from '../src/modules/tenant/tenant.service';
import { CampaignsService } from '../src/modules/campaigns/campaigns.service';
import { LeadsService } from '../src/modules/leads/leads.service';
import { QuotaService } from '../src/modules/quota/quota.service';
import { WebhookService } from '../src/modules/ai-call/webhook.service';
import { CampaignModuleType } from '@shared/enums/campaign-module-type.enum';
import { CampaignStatus } from '@shared/enums/campaign-status.enum';
import { VapiCallStatus } from '../src/modules/ai-call/dto/vapi-webhook.dto';
import { Repository } from 'typeorm';
import { Tenant } from '../src/modules/tenant/tenant.entity';
import { User } from '../src/modules/user/user.entity';
import { Role } from '@shared/enums/role.enum';
import { TenantQuota } from '../src/modules/quota/tenant-quota.entity';
import { CampaignItem } from '../src/modules/campaigns/campaign-item.entity';
import { CampaignItemStatus } from '@shared/enums/campaign-item-status.enum';
import { LeadSource } from '@shared/enums/lead-source.enum';
import { Logger } from '@nestjs/common';
import * as crypto from 'crypto';

const logger = new Logger('ValidateEngine');

async function bootstrap() {
    logger.log('Starting validation script...');
    try {
        const app = await NestFactory.createApplicationContext(AppModule);

        const tenantService = app.get(TenantService);
        const campaignsService = app.get(CampaignsService);
        const leadsService = app.get(LeadsService);
        const quotaService = app.get(QuotaService);
        const webhookService = app.get(WebhookService);
        const tenantRepo = app.get<Repository<Tenant>>('TenantRepository');
        const quotaRepo = app.get<Repository<TenantQuota>>('TenantQuotaRepository');
        const campaignItemRepo = app.get<Repository<CampaignItem>>('CampaignItemRepository');

        logger.log('Context loaded. Creating test tenant...');

        let tenant = await tenantRepo.findOne({ where: { name: 'VALIDATION_TENANT' } });
        if (!tenant) {
            tenant = tenantRepo.create({ name: 'VALIDATION_TENANT', isActive: true });
            tenant = await tenantRepo.save(tenant);
        }
        const tenantId = tenant.id;
        logger.log(`Tenant created: ${tenantId}`);

        let quota = await quotaRepo.findOne({ where: { tenantId, moduleType: CampaignModuleType.AI_CALL } });
        if (!quota) {
            quota = quotaRepo.create({
                tenantId,
                moduleType: CampaignModuleType.AI_CALL,
                monthlyLimit: 10,
                usedThisMonth: 0,
                resetAt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
            });
            await quotaRepo.save(quota);
        } else {
            quota.monthlyLimit = 10;
            quota.usedThisMonth = 0;
            await quotaRepo.save(quota);
        }
        logger.log('Quota reset to 10.');

        logger.log('Creating 5 leads...');
        const leadsToCreate = Array.from({ length: 5 }).map((_, i) => ({
            companyName: `Test Company ${i}`,
            phone: `+1000000000${i}`,
            website: `http://example.com/${i}`,
            source: LeadSource.MANUAL,
        }));
        await leadsService.createManyLeads(tenantId, leadsToCreate);
        const { data: leads } = await leadsService.getLeads(tenantId);
        logger.log(`Total leads for tenant: ${leads.length}`);

        logger.log('Creating campaign...');
        const sysUserId = crypto.randomUUID();
        const campaign = await campaignsService.createCampaign(tenantId, sysUserId, {
            name: 'Test Validation Campaign',
            moduleType: CampaignModuleType.AI_CALL,
            leadIds: leads.map(l => l.id).slice(0, 5),
        });
        logger.log(`Campaign created: ${campaign.id} with status ${campaign.status}`);

        const report = {
            quotaEnforcement: false,
            campaignLifecycle: false,
            webhookIdempotency: false,
            countersTotal: false,
            overallSuccess: false,
        };

        try {
            logger.log('Check 1: Testing Over Quota Validation');
            await quotaService.checkQuotaForCampaignStart(tenantId, CampaignModuleType.AI_CALL, 15);
            logger.error('Check 1 FAILED - Allowed starting campaign over quota');
        } catch (err: any) {
            if (err.status === 400 || (err.message && err.message.toLowerCase().includes('quota'))) {
                logger.log('Check 1 PASSED - Quota enforcement triggered');
                report.quotaEnforcement = true;
            } else {
                logger.error(`Check 1 FAILED - Unknown error: ${err.message}`);
            }
        }

        try {
            logger.log('Check 2: Starting Campaign');
            const startedCampaign = await campaignsService.startCampaign(tenantId, campaign.id);
            if (startedCampaign.status === CampaignStatus.READY) {
                logger.log('Check 2 PASSED - Campaign is READY');
                report.campaignLifecycle = true;
            } else {
                logger.error(`Check 2 FAILED - Status is ${startedCampaign.status}`);
            }
        } catch (err: any) {
            logger.error(`Check 2 FAILED - Failed to start campaign: ${err.message}`);
        }

        logger.log('Mocking worker picking up items...');
        await campaignsService.updateCampaignStatus(tenantId, campaign.id, CampaignStatus.RUNNING);

        const items = await campaignItemRepo.find({ where: { tenantId, campaignId: campaign.id } });
        for (let i = 0; i < items.length; i++) {
            items[i].status = CampaignItemStatus.PROCESSING;
            items[i].externalRefId = `mock-call-${i}`;
            await campaignItemRepo.save(items[i]);
        }

        logger.log('Check 3: Testing Webhook & Counters');
        for (let i = 0; i < 3; i++) {
            await webhookService.handleVapiWebhook({
                callId: `mock-call-${i}`,
                status: VapiCallStatus.COMPLETED,
                transcript: '',
                outcome: '',
            } as any);
        }

        for (let i = 3; i < 5; i++) {
            await webhookService.handleVapiWebhook({
                callId: `mock-call-${i}`,
                status: VapiCallStatus.FAILED,
                transcript: '',
                outcome: '',
            } as any);
        }

        await webhookService.handleVapiWebhook({
            callId: `mock-call-0`,
            status: VapiCallStatus.COMPLETED,
        } as any);

        const finalCampaign = await campaignsService.getCampaignDetails(tenantId, campaign.id);
        logger.log(`Final Campaign details: Processed ${finalCampaign.processedItems}/${finalCampaign.totalItems}`);
        logger.log(`Success: ${finalCampaign.successCount}, Failed: ${finalCampaign.failureCount}`);

        if (finalCampaign.processedItems === 5 && finalCampaign.successCount === 3 && finalCampaign.failureCount === 2) {
            logger.log('Check 3 PASSED - Webhooks tracked correctly');
            report.webhookIdempotency = true;
            report.countersTotal = true;
        } else {
            logger.error('Check 3 FAILED - Counter mismatch');
        }

        if (finalCampaign.status === CampaignStatus.COMPLETED) {
            logger.log('Campaign correctly auto-transitioned to COMPLETED');
        } else {
            logger.error(`Campaign did not auto-transition. Status is ${finalCampaign.status}`);
        }

        report.overallSuccess = Object.values(report).every(v => v === true);

        console.log('\n=======================================');
        console.log('VALIDATION REPORT');
        console.log('=======================================');
        console.log(JSON.stringify(report, null, 2));

        await app.close();
        process.exit(report.overallSuccess ? 0 : 1);
    } catch (error) {
        logger.error('Fatal execution error:', error);
        process.exit(1);
    }
}

bootstrap();
