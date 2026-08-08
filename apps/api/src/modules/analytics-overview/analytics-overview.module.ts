import {
    Module,
} from '@nestjs/common';

import {
    DatabaseModule,
} from 'src/database/database.module';


import {
    AnalyticsOverviewService,
} from './services/analytics-overview.service';
import { AnalyticsOverviewController } from './services/controllers/analytics-overview.controller';

@Module({
    imports: [
        DatabaseModule,
    ],

    controllers: [
        AnalyticsOverviewController,
    ],

    providers: [
        AnalyticsOverviewService,
    ],

    exports: [
        AnalyticsOverviewService,
    ],
})
export class AnalyticsOverviewModule { }