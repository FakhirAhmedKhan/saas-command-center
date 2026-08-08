import { WorkspaceMembersModule } from 'src/modules/workspace/modules/workspace-members.module';
import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { DeploymentsController } from './controllers/deployments.controller';

import { ReleasesController } from './controllers/releases.controller';

import { DeploymentTransitionService } from './services/deployment-transition.service';

import { ReleaseAccessService } from './services/release-access.service';

import { ReleaseDeploymentService } from './services/release-deployment.service';

@Module({
  imports: [
        WorkspaceMembersModule,DatabaseModule],

  controllers: [ReleasesController, DeploymentsController],

  providers: [ReleaseAccessService, DeploymentTransitionService, ReleaseDeploymentService],

  exports: [ReleaseDeploymentService],
})
export class ReleasesModule {}
