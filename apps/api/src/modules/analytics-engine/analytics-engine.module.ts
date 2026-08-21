import { AnalyticsEngineController } from './controllers/analytics-engine.controller';
import { AnalyticsAggregationService } from './services/analytics-aggregation.service';
import { AnalyticsEngineQueryService } from './services/analytics-engine-query.service';
import { AnalyticsProcessingSchedulerService } from './services/analytics-processing-scheduler.service';
import { AnalyticsProcessingService } from './services/analytics-processing.service';
import { PageViewRebuilderService } from './services/page-view-rebuilder.service';
import { RawEventProcessingService } from './services/raw-event-processing.service';
import { SessionRebuilderService } from './services/session-rebuilder.service';
import { VisitorRebuilderService } from './services/visitor-rebuilder.service';
import { WorkspaceModule } from '../workspace/modules/workspaces.module';
import { Module } from '@nestjs/common';
import { WorkspaceMembersModule } from 'src/modules/workspace/modules/workspace-members.module';

@Module({
  imports: [WorkspaceMembersModule, WorkspaceModule],
  controllers: [AnalyticsEngineController],
  providers: [
    AnalyticsEngineQueryService,
    AnalyticsProcessingService,
    AnalyticsProcessingSchedulerService,
    RawEventProcessingService,
    VisitorRebuilderService,
    SessionRebuilderService,
    PageViewRebuilderService,
    AnalyticsAggregationService,
  ],

  exports: [
    AnalyticsEngineQueryService,
    AnalyticsProcessingService,
    RawEventProcessingService,
    VisitorRebuilderService,
    SessionRebuilderService,
    PageViewRebuilderService,
    AnalyticsAggregationService,
  ],
})
export class AnalyticsEngineModule {}
