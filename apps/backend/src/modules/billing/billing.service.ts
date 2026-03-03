import { Injectable, Logger, RawBodyRequest } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Stripe from 'stripe';
import { Tenant, TenantDocument } from '../tenant/tenant.entity';
import { CampaignModuleType } from '@shared/enums/campaign-module-type.enum';

@Injectable()
export class BillingService {
    private stripe: Stripe;
    private readonly logger = new Logger(BillingService.name);

    constructor(
        @InjectModel(Tenant.name)
        private tenantModel: Model<TenantDocument>,
    ) {
        this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
            apiVersion: '2026-01-28.clover' as any,
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
                        unit_amount: 4900,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${process.env.FRONTEND_URL || 'http://localhost:4000'}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:4000'}/billing/cancel`,
            client_reference_id: tenantId,
            metadata: { tenantId, moduleType },
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
            }
        }
    }

    private async unlockModuleForTenant(tenantId: string, moduleType: CampaignModuleType) {
        const result = await this.tenantModel.findOneAndUpdate(
            { _id: tenantId, enabledModules: { $ne: moduleType } },
            { $push: { enabledModules: moduleType } },
        );

        if (result) {
            this.logger.log(`Successfully unlocked ${moduleType} for Tenant ${tenantId}`);
        } else {
            this.logger.log(`Module ${moduleType} already enabled or tenant not found for ${tenantId}`);
        }
    }
}
