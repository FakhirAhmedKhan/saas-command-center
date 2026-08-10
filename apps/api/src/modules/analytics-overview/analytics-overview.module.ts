import { AnalyticsOverviewService } from './services/analytics-overview.service';
import { AnalyticsOverviewController } from './services/controllers/analytics-overview.controller';
import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { WorkspaceMembersModule } from 'src/modules/workspace/modules/workspace-members.module';

@Module({
  imports: [WorkspaceMembersModule, DatabaseModule],

  controllers: [AnalyticsOverviewController],

  providers: [AnalyticsOverviewService],

  exports: [AnalyticsOverviewService],
})
export class AnalyticsOverviewModule {}
