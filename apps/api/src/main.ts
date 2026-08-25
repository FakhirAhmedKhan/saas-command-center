import { AppModule } from './app.module';
import { configureApplication } from './bootstrap/configure-application';
import { assertStartupRequirements } from './bootstrap/startup-checks';
import { createRequestId, REQUEST_ID_HEADER } from './common/middleware/request-id.middleware';
import { validateEnvironment } from './config/env.validation';
import { parseBodyLimit, parseTrustProxy, type TypedConfigService } from './config/runtime-config';
import { type INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { config as loadEnvironment } from 'dotenv';
import type { IncomingMessage } from 'node:http';

loadEnvironment({
  path: ['../../.env', '.env'],
});

async function bootstrap(): Promise<void> {
  const environment = validateEnvironment(process.env);
  const adapter = new FastifyAdapter({
    trustProxy: parseTrustProxy(environment.TRUST_PROXY),
    bodyLimit: parseBodyLimit(environment.BODY_LIMIT),
    genReqId: (request: IncomingMessage) => createRequestId(request.headers[REQUEST_ID_HEADER]),
  });
  const app: INestApplication = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    bufferLogs: true,

    // Keeps the original raw payload available for signed webhooks.
    rawBody: true,
  });

  configureApplication(app);

  await assertStartupRequirements(app);

  const config = app.get<TypedConfigService>(ConfigService);
  const port = config.get('PORT', {
    infer: true,
  });

  await app.listen(port, '0.0.0.0');

  const logger = new Logger('Bootstrap');
  logger.log(`Command Center API running on port ${port}.`);
}

void bootstrap();
