import { WorkspaceMembersModule } from 'src/modules/workspace/modules/workspace-members.module';
import { Module } from '@nestjs/common';

import { DatabaseModule } from 'src/database/database.module';

import { AnalyticsReportsController } from './controllers/analytics-reports.controller';

import { AnalyticsReportsService } from './services/analytics-reports.service';

@Module({
  imports: [
        WorkspaceMembersModule,DatabaseModule],

  controllers: [AnalyticsReportsController],

  providers: [AnalyticsReportsService],

  exports: [AnalyticsReportsService],
})
export class AnalyticsReportsModule {}
