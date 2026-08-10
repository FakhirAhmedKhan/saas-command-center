import { ActivityModule } from '../activity/activity.module';
import { DevelopmentController, DevelopmentTemplatesController } from './controllers/development.controller';
import { DevelopmentService } from './services/development.service';
import { ProgressCalculatorService } from './services/progress-calculator.service';
import { WorkspaceModule } from '../workspace/modules/workspaces.module';
import { Module } from '@nestjs/common';
import { WorkspaceMembersModule } from 'src/modules/workspace/modules/workspace-members.module';

@Module({
  imports: [WorkspaceMembersModule, WorkspaceModule, ActivityModule],
  controllers: [DevelopmentTemplatesController, DevelopmentController],
  providers: [DevelopmentService, ProgressCalculatorService],
  exports: [DevelopmentService, ProgressCalculatorService],
})
export class DevelopmentModule {}
