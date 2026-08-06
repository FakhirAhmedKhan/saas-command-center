import 'reflect-metadata';

import { randomUUID } from 'node:crypto';

import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const apiPort = Number(
    configService.get<string>('API_PORT') ??
    configService.get<string>('PORT') ??
    '4000',
  );

  const webUrl = configService.get<string>(
    'WEB_URL',
    'http://localhost:3000',
  );

  if (!Number.isInteger(apiPort) || apiPort <= 0) {
    throw new Error(`Invalid API port: ${apiPort}`);
  }

  /*
   * Required when the API runs behind Nginx, Render,
   * Railway, Cloudflare or another reverse proxy.
   */
  app.set('trust proxy', 1);

  app.enableShutdownHooks();

  app.use(helmet());

  app.enableCors({
    origin: webUrl,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-Id',
    ],
    exposedHeaders: ['X-Request-Id'],
  });

  /*
   * Attach a request ID to every incoming request.
   */
  app.use(
    (
      request: Request,
      response: Response,
      next: NextFunction,
    ): void => {
      const providedRequestId = request
        .header('x-request-id')
        ?.trim();

      const requestId = providedRequestId || randomUUID();

      request.headers['x-request-id'] = requestId;
      response.setHeader('x-request-id', requestId);

      next();
    },
  );

  /*
   * The tracker sends text/plain requests so browser requests
   * remain CORS-safelisted and avoid unnecessary preflight calls.
   *
   * The route includes the global API prefix because Express
   * middleware is registered before Nest route resolution.
   */
  app.use(
    '/api/v1/collect',
    express.text({
      type: 'text/plain',
      limit: '64kb',
    }),
  );

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SaaS Command Center API')
    .setDescription('Project Visibility MVP API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(
    app,
    swaggerConfig,
  );

  SwaggerModule.setup(
    'api/v1/docs',
    app,
    swaggerDocument,
    {
      customSiteTitle: 'Command Center API Docs',
    },
  );

  await app.listen(apiPort, '0.0.0.0');

  logger.log(
    `API running at http://localhost:${apiPort}/api/v1`,
  );

  logger.log(
    `Swagger running at http://localhost:${apiPort}/api/v1/docs`,
  );
}

void bootstrap();