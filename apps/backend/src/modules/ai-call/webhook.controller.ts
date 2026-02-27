import { Controller, Post, Body } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { VapiWebhookDto } from './dto/vapi-webhook.dto';

@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('vapi')
  handleVapiWebhook(@Body() dto: VapiWebhookDto) {
    return this.webhookService.handleVapiWebhook(dto);
  }
}
