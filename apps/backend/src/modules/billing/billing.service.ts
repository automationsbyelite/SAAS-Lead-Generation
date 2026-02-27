import { Injectable, Logger, RawBodyRequest } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { Tenant } from '../tenant/tenant.entity';
import { CampaignModuleType } from '@shared/enums/campaign-module-type.enum';

@Injectable()
export class BillingService {
    private stripe: Stripe;
    private readonly logger = new Logger(BillingService.name);

    constructor(
        @InjectRepository(Tenant)
        private tenantRepository: Repository<Tenant>,
    ) {
        this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
            apiVersion: '2026-01-28.clover' as any, // Latest API version
        });
    }

    async createCheckoutSession(tenantId: string, moduleType: CampaignModuleType): Promise<{ url: string }> {
        const session = await this.stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `${moduleType.replace('_', ' ')} Extension Module`,
                            description: `Unlocks the ${moduleType} engine for your tenant workspace.`,
                        },
                        unit_amount: 4900, // $49.00
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${process.env.FRONTEND_URL || 'http://localhost:4000'}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:4000'}/billing/cancel`,
            client_reference_id: tenantId,
            metadata: {
                tenantId,
                moduleType,
            },
        });

        return { url: session.url! };
    }

    async handleWebhook(signature: string, payload: Buffer): Promise<void> {
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder';

        let event: Stripe.Event;

        try {
            event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
        } catch (err: any) {
            this.logger.error(`Webhook signature verification failed: ${err.message}`);
            throw new Error(`Webhook Error: ${err.message}`);
        }

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;

            const tenantId = session.metadata?.tenantId;
            const moduleType = session.metadata?.moduleType as CampaignModuleType;

            if (tenantId && moduleType) {
                this.logger.log(`Payment successful for Tenant ${tenantId}. Unlocking module: ${moduleType}`);
                await this.unlockModuleForTenant(tenantId, moduleType);
            } else {
                this.logger.warn(`Checkout session completed but missing metadata. Session ID: ${session.id}`);
            }
        }
    }

    private async unlockModuleForTenant(tenantId: string, moduleType: CampaignModuleType) {
        const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
        if (!tenant) {
            this.logger.error(`Tenant ${tenantId} not found during module unlock.`);
            return;
        }

        if (!tenant.enabledModules) {
            tenant.enabledModules = [];
        }

        if (!tenant.enabledModules.includes(moduleType)) {
            tenant.enabledModules.push(moduleType);
            await this.tenantRepository.save(tenant);
            this.logger.log(`Successfully unlocked ${moduleType} for Tenant ${tenantId}`);
        }
    }
}
