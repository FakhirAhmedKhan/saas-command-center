import { SharedRateLimitModule } from '../../common/rate-limit/shared-rate-limit.module';
import { DatabaseModule } from '../../database/database.module';
import { PostgresAdvisoryLockService } from '../../infrastructure/database/postgres-advisory-lock.service';
import { AnalyticsEngineModule } from '../analytics-engine/analytics-engine.module';
import { AnalyticsProcessingController } from './controllers/analytics-processing.controller';
import { AnalyticsProcessingAccessService } from './services/analytics-processing-access.service';
import { AnalyticsProcessingQueueService } from './services/analytics-processing-queue.service';
import { AnalyticsProcessingSchedulerService } from './services/analytics-processing-scheduler.service';
import { AnalyticsProcessingStatusService } from './services/analytics-processing-status.service';
import { AnalyticsProcessingWorkerService } from './services/analytics-processing-worker.service';
import { AnalyticsRangeProcessorService } from './services/analytics-range-processor.service';
import { Module } from '@nestjs/common';
import { WorkspaceMembersModule } from 'src/modules/workspace/modules/workspace-members.module';

@Module({
  imports: [WorkspaceMembersModule, DatabaseModule, AnalyticsEngineModule, SharedRateLimitModule],
  controllers: [AnalyticsProcessingController],
  providers: [
    PostgresAdvisoryLockService,

    AnalyticsProcessingAccessService,

    AnalyticsProcessingStatusService,

    AnalyticsProcessingQueueService,

    AnalyticsProcessingSchedulerService,

    AnalyticsProcessingWorkerService,

    AnalyticsRangeProcessorService,
  ],

  exports: [AnalyticsProcessingQueueService, AnalyticsProcessingStatusService],
})
export class AnalyticsProcessingModule {}
