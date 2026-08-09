import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { GithubConnectController } from './controllers/github-connect.controller';
import { GithubWebhookController } from './controllers/github-webhook.controller';
import { RepositoriesController } from './controllers/repositories.controller';
import { GithubAppService } from './services/github-app.service';
import { GithubWebhookService } from './services/github-webhook.service';
import { RepositoriesService } from './services/repositories.service';
import { RepositoryConnectService } from './services/repository-connect.service';

@Module({
    imports: [DatabaseModule],

    controllers: [
        RepositoriesController,
        GithubConnectController,
        GithubWebhookController,
    ],

    providers: [
        GithubAppService,
        RepositoriesService,
        RepositoryConnectService,
        GithubWebhookService,
    ],

    exports: [
        GithubAppService,
        RepositoriesService,
    ],
})
export class RepositoriesModule { }