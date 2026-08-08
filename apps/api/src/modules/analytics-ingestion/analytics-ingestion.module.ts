import { SharedRateLimitModule } from 'src/common/rate-limit/shared-rate-limit.module';
import { WorkspaceMembersModule } from 'src/modules/workspace/modules/workspace-members.module';
import { Module } from '@nestjs/common';

import { AnalyticsIngestionController } from './controllers/analytics-ingestion.controller';

import { TrackingAdminController } from './controllers/tracking-admin.controller';

import { AnalyticsIngestionService } from './services/analytics-ingestion.service';

import { IngestionRateLimitService } from './services/ingestion-rate-limit.service';

import { TrackingAdminService } from './services/tracking-admin.service';
import { WorkspaceModule } from '../workspace/modules/workspaces.module';

@Module({
  imports: [SharedRateLimitModule, WorkspaceMembersModule, WorkspaceModule],

  controllers: [AnalyticsIngestionController, TrackingAdminController],

  providers: [AnalyticsIngestionService, IngestionRateLimitService, TrackingAdminService],

  exports: [AnalyticsIngestionService, TrackingAdminService],
})
export class AnalyticsIngestionModule {}
