import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { DatabaseModule } from '../database/database.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [DatabaseModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
