import {
    Module,
} from '@nestjs/common';

import {
    SharedRateLimitGuard,
} from './shared-rate-limit.guard';

import {
    SharedRateLimitService,
} from './shared-rate-limit.service';

@Module({
    providers: [
        SharedRateLimitService,
        SharedRateLimitGuard,
    ],

    exports: [
        SharedRateLimitService,
        SharedRateLimitGuard,
    ],
})
export class SharedRateLimitModule { }