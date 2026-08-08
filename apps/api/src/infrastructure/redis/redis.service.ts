import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import Redis from 'ioredis';

import type { TypedConfigService } from '../../config/runtime-config';

@Injectable()
export class RedisService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  private readonly client: Redis;

  constructor(
    @Inject(ConfigService)
    config: TypedConfigService,
  ) {
    this.client = new Redis(
      config.get('REDIS_URL', {
        infer: true,
      }),
      {
        enableReadyCheck: true,

        maxRetriesPerRequest: 3,

        lazyConnect: true,

        retryStrategy(attempt) {
          return Math.min(attempt * 250, 5_000);
        },
      },
    );

    this.client.on('error', (error) => {
      this.logger.error(error.message, error.stack);
    });
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.client.connect();

    const result = await this.client.ping();

    if (result !== 'PONG') {
      throw new Error('Redis health check failed.');
    }

    this.logger.log('Redis connection established.');
  }

  getClient(): Redis {
    return this.client;
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
