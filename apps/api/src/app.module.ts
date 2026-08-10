import { validateEnvironment } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { ActivityModule } from './modules/activity/activity.module';
import { AnalyticsEngineModule } from './modules/analytics-engine/analytics-engine.module';
import { AnalyticsIngestionModule } from './modules/analytics-ingestion/analytics-ingestion.module';
import { AnalyticsOverviewModule } from './modules/analytics-overview/analytics-overview.module';
import { AnalyticsProcessingModule } from './modules/analytics-processing/analytics-processing.module';
import { AnalyticsReportsModule } from './modules/analytics-reports/analytics-reports.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { AuthSessionsModule } from './modules/auth/module/auth-sessions.module';
import { AuthModule } from './modules/auth/module/auth.module';
import { DevelopmentModule } from './modules/development/development.module';
import { HealthModule } from './modules/health/health.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { RepositoriesModule } from './modules/repositories/repositories.module';
import { TeamOperationsModule } from './modules/team-operations/team-operations.module';
import { UsersModule } from './modules/users/users.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { WebsitesModule } from './modules/websites/websites.module';
import { WorkspaceMembersModule } from './modules/workspace/modules/workspace-members.module';
import { WorkspaceModule } from './modules/workspace/modules/workspaces.module';
import { VersionModule } from './version/version.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      envFilePath: ['../../.env', '.env'],
      isGlobal: true,
      validate: validateEnvironment,
    }),

    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    RepositoriesModule,
    ApplicationsModule,
    DatabaseModule,
    UsersModule,
    WebsitesModule,
    WorkspaceModule,
    WorkspaceMembersModule,
    AuthSessionsModule,
    AuthModule,
    HealthModule,
    VersionModule,
    ActivityModule,
    DevelopmentModule,
    AnalyticsIngestionModule,
    AnalyticsEngineModule,
    AnalyticsOverviewModule,
    AnalyticsReportsModule,

    RedisModule,
    MonitoringModule,
    TeamOperationsModule,
    WebhooksModule,

    AnalyticsProcessingModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
