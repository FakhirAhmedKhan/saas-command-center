import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { HealthResponse } from '@command-center/shared-types';
import { DatabaseHealthService } from '../database/database-health.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly databaseHealthService: DatabaseHealthService,
  ) {}

  async getHealth(): Promise<HealthResponse> {
    const database = await this.databaseHealthService.check();

    return {
      status: database.status === 'up' ? 'ok' : 'error',
      service: 'command-center-api',
      version: process.env.npm_package_version ?? '0.1.0',
      environment:
        this.configService.get<string>('NODE_ENV') ??
        'development',
      timestamp: new Date().toISOString(),
      database,
    };
  }
}