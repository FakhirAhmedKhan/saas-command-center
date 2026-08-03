import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthSessionsModule } from './auth-sessions/auth-sessions.module';
import { validateEnvironment } from './common/config/env.validation';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { VersionModule } from './version/version.module';
import { WorkspaceMembersModule } from './workspace-members/workspace-members.module';
import { WorkspacesModule } from './workspaces/workspaces.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      envFilePath: ['../../.env', '.env'],
      isGlobal: true,
      validate: validateEnvironment,
    }),

    DatabaseModule,

    UsersModule,
    WorkspacesModule,
    WorkspaceMembersModule,
    AuthSessionsModule,

    HealthModule,
    VersionModule,
  ],
})
export class AppModule { }