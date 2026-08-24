import { MonitoringController } from './controllers/monitoring.controller';
import { HealthCheckRunnerService } from './services/health-check-runner.service';
import { HealthMonitoringSchedulerService } from './services/health-monitoring-scheduler.service';
import { MonitoringAccessService } from './services/monitoring-access.service';
import { MonitoringService } from './services/monitoring.service';
import { SafeHttpClientService } from './services/safe-http-client.service';
import { DatabaseModule } from '../../database/database.module';
import { PostgresAdvisoryLockService } from '../../infrastructure/database/postgres-advisory-lock.service';
import { Module } from '@nestjs/common';
import { WorkspaceMembersModule } from 'src/modules/workspace/modules/workspace-members.module';

@Module({
  imports: [WorkspaceMembersModule, DatabaseModule],
  controllers: [MonitoringController],
  providers: [PostgresAdvisoryLockService, SafeHttpClientService, MonitoringAccessService, MonitoringService, HealthCheckRunnerService, HealthMonitoringSchedulerService],

  exports: [MonitoringService, HealthCheckRunnerService],
})
export class MonitoringModule {}
