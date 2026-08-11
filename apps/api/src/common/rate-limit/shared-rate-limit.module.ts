import { SharedRateLimitGuard } from './shared-rate-limit.guard';
import { SharedRateLimitService } from './shared-rate-limit.service';
import { Module } from '@nestjs/common';

@Module({
  providers: [SharedRateLimitService, SharedRateLimitGuard],

  exports: [SharedRateLimitService, SharedRateLimitGuard],
})
export class SharedRateLimitModule {}
