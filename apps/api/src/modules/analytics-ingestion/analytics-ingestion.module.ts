import {
    Module,
} from '@nestjs/common';



import {
    AnalyticsIngestionController,
} from './controllers/analytics-ingestion.controller';

import {
    TrackingAdminController,
} from './controllers/tracking-admin.controller';

import {
    AnalyticsIngestionService,
} from './services/analytics-ingestion.service';

import {
    IngestionRateLimitService,
} from './services/ingestion-rate-limit.service';

import {
    TrackingAdminService,
} from './services/tracking-admin.service';
import { WorkspaceModule } from '../workspace/modules/workspaces.module';

@Module({
    imports: [
        WorkspaceModule,
    ],

    controllers: [
        AnalyticsIngestionController,
        TrackingAdminController,
    ],

    providers: [
        AnalyticsIngestionService,
        IngestionRateLimitService,
        TrackingAdminService,
    ],

    exports: [
        AnalyticsIngestionService,
        TrackingAdminService,
    ],
})
export class AnalyticsIngestionModule { }