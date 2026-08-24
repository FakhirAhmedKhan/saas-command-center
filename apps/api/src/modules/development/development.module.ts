import { ActivityModule } from '../activity/activity.module';
import { DevelopmentController, DevelopmentTemplatesController } from './controllers/development.controller';
import { BlockersService } from './services/blockers.service';
import { DevelopmentSharedService } from './services/development-shared.service';
import { DevelopmentSummaryService } from './services/development-summary.service';
import { DevelopmentTemplatesService } from './services/development-templates.service';
import { MilestonesService } from './services/milestones.service';
import { ProgressCalculatorService } from './services/progress-calculator.service';
import { TasksService } from './services/tasks.service';
import { WorkspaceModule } from '../workspace/modules/workspaces.module';
import { Module } from '@nestjs/common';
import { WorkspaceMembersModule } from 'src/modules/workspace/modules/workspace-members.module';

@Module({
  imports: [WorkspaceMembersModule, WorkspaceModule, ActivityModule],
  controllers: [DevelopmentTemplatesController, DevelopmentController],
  providers: [ProgressCalculatorService, DevelopmentSharedService, DevelopmentSummaryService, DevelopmentTemplatesService, MilestonesService, TasksService, BlockersService],
  exports: [ProgressCalculatorService, DevelopmentSharedService, DevelopmentSummaryService, DevelopmentTemplatesService, MilestonesService, TasksService, BlockersService],
})
export class DevelopmentModule {}
