import { Module } from '@nestjs/common';


import { ApplicationsController } from './controllers/applications.controller';
import { ApplicationsService } from './services/applications.service';
import { WorkspaceModule } from '../workspace/modules/workspaces.module';

@Module({
    imports: [WorkspaceModule],

    controllers: [ApplicationsController],

    providers: [ApplicationsService],

    exports: [ApplicationsService],
})
export class ApplicationsModule { }