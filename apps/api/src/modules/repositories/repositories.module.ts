import {
    Module,
} from '@nestjs/common';

import {
    DatabaseModule,
} from '../../database/database.module';

import {
    WorkspaceMembersModule,
} from '../workspace/modules/workspace-members.module';

import {
    CodeExplorerController,
} from './controllers/code-explorer.controller';

import {
    GithubConnectController,
} from './controllers/github-connect.controller';

import {
    GithubWebhookController,
} from './controllers/github-webhook.controller';

import {
    RepositoriesController,
} from './controllers/repositories.controller';

import {
    CodeExplorerService,
} from './services/code-explorer.service';

import {
    GithubAppService,
} from './services/github-app.service';

import {
    GithubCodeService,
} from './services/github-code.service';

import {
    GithubWebhookService,
} from './services/github-webhook.service';

import {
    RepositoriesService,
} from './services/repositories.service';

import {
    RepositoryConnectService,
} from './services/repository-connect.service';

@Module({
    imports: [
        DatabaseModule,

        WorkspaceMembersModule,
    ],

    controllers: [
        RepositoriesController,

        GithubConnectController,

        GithubWebhookController,

        CodeExplorerController,
    ],

    providers: [
        GithubAppService,

        GithubCodeService,

        RepositoriesService,

        RepositoryConnectService,

        GithubWebhookService,

        CodeExplorerService,
    ],

    exports: [
        GithubAppService,

        GithubCodeService,

        RepositoriesService,

        CodeExplorerService,
    ],
})
export class RepositoriesModule { }