import { WorkspaceMembersModule } from 'src/modules/workspace/modules/workspace-members.module';
import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { SharedRateLimitModule } from '../../common/rate-limit/shared-rate-limit.module';

import { PostgresAdvisoryLockService } from '../../infrastructure/database/postgres-advisory-lock.service';

import { WebhooksController } from './controllers/webhooks.controller';

import { WebhookAccessService } from './services/webhook-access.service';

import { WebhookCleanupService } from './services/webhook-cleanup.service';

import { WebhookDeliveryWorkerService } from './services/webhook-delivery-worker.service';

import { WebhookEventPublisherService } from './services/webhook-event-publisher.service';

import { WebhookManagementService } from './services/webhook-management.service';

import { WebhookOutboundClientService } from './services/webhook-outbound-client.service';

import { WebhookSecretCryptoService } from './services/webhook-secret-crypto.service';

import { WebhookSignatureService } from './services/webhook-signature.service';

@Module({
  imports: [
        WorkspaceMembersModule,DatabaseModule, SharedRateLimitModule],

  controllers: [WebhooksController],

  providers: [
    PostgresAdvisoryLockService,

    WebhookAccessService,
    WebhookSecretCryptoService,
    WebhookSignatureService,
    WebhookOutboundClientService,
    WebhookEventPublisherService,
    WebhookManagementService,
    WebhookDeliveryWorkerService,
    WebhookCleanupService,
  ],

  exports: [WebhookEventPublisherService],
})
export class WebhooksModule {}
