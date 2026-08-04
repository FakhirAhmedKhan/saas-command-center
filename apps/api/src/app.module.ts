import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import {
  ThrottlerGuard,
  ThrottlerModule,
} from '@nestjs/throttler';

import {
  validateEnvironment,
} from './common/config/env.validation';
import {
  DatabaseModule,
} from './database/database.module';
import {
  HealthModule,
} from './health/health.module';
import { AuthSessionsModule } from './modules/auth/module/auth-sessions.module';
import { AuthModule } from './modules/auth/module/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WorkspaceMembersModule } from './modules/workspace/modules/workspace-members.module';
import { WorkspacesModule } from './modules/workspace/modules/workspaces.module';
import { VersionModule } from './version/version.module';


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

    DatabaseModule,
    UsersModule,
    WorkspacesModule,
    WorkspaceMembersModule,
    AuthSessionsModule,
    AuthModule,
    HealthModule,
    VersionModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }