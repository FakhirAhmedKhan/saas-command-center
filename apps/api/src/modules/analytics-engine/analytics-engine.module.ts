import {
    Module,
} from '@nestjs/common';



import {
    AnalyticsEngineController,
} from './controllers/analytics-engine.controller';

import {
    AnalyticsEngineQueryService,
} from './services/analytics-engine-query.service';

import {
    AnalyticsProcessingSchedulerService,
} from './services/analytics-processing-scheduler.service';

import {
    AnalyticsProcessingService,
} from './services/analytics-processing.service';
import { WorkspaceModule } from '../workspace/modules/workspaces.module';

@Module({
    imports: [
        WorkspaceModule,
    ],

    controllers: [
        AnalyticsEngineController,
    ],

    providers: [
        AnalyticsEngineQueryService,
        AnalyticsProcessingService,
        AnalyticsProcessingSchedulerService,
    ],

    exports: [
        AnalyticsEngineQueryService,
        AnalyticsProcessingService,
    ],
})
export class AnalyticsEngineModule { }