import { CodeExplorerController } from './controllers/code-explorer.controller';
import { GithubConnectController } from './controllers/github-connect.controller';
import { GithubWebhookController } from './controllers/github-webhook.controller';
import { RepositoriesController } from './controllers/repositories.controller';
import { RepositoryImportController } from './controllers/repository-import.controller';
import { CodeExplorerService } from './services/code-explorer.service';
import { GithubAppService } from './services/github-app.service';
import { GithubCodeService } from './services/github-code.service';
import { GithubConnectIntentCleanupService } from './services/github-connect-intent-cleanup.service';
import { GithubWebhookService } from './services/github-webhook.service';
import { PersonalGithubConnectService } from './services/personal-github-connect.service';
import { PersonalRepositoriesService } from './services/personal-repositories.service';
import { RepositoriesService } from './services/repositories.service';
import { RepositoryAnalyzerService } from './services/repository-analyzer.service';
import { RepositoryConnectService } from './services/repository-connect.service';
import { RepositoryImportService } from './services/repository-import.service';
import { DatabaseModule } from '../../database/database.module';
import { ActivityModule } from '../activity/activity.module';
import { WorkspaceMembersModule } from '../workspace/modules/workspace-members.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [DatabaseModule, WorkspaceMembersModule, ActivityModule],

  controllers: [RepositoriesController, GithubConnectController, GithubWebhookController, CodeExplorerController, RepositoryImportController],

  providers: [
    GithubAppService,
    GithubCodeService,
    RepositoriesService,
    RepositoryConnectService,
    GithubWebhookService,
    CodeExplorerService,
    PersonalGithubConnectService,
    PersonalRepositoriesService,
    RepositoryAnalyzerService,
    RepositoryImportService,
    GithubConnectIntentCleanupService,
  ],

  exports: [RepositoriesService, GithubCodeService],
})
export class RepositoriesModule {}
