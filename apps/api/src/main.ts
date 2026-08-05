import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');
  const apiPort = config.get<number>('API_PORT', 4000);
  const webUrl = config.get<string>('WEB_URL', 'http://localhost:3000');

  app.enableShutdownHooks();
  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.enableCors({
    origin: webUrl,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  });

  app.use((request: Request, response: Response, next: NextFunction) => {
    const requestId = request.header('x-request-id')?.trim() || randomUUID();
    response.setHeader('x-request-id', requestId);
    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  import {
    ValidationPipe,
  } from '@nestjs/common';

  import {
    NestFactory,
  } from '@nestjs/core';

  import {
    NestExpressApplication,
  } from '@nestjs/platform-express';

  import express from 'express';

  import {
    AppModule,
  } from './app.module';

  async function bootstrap() {
    const app =
      await NestFactory.create<
        NestExpressApplication
      >(AppModule);

    app.set(
      'trust proxy',
      1,
    );

    /*
     * Tracker uses text/plain so requests from
     * external websites remain CORS-safelisted
     * and do not require a preflight request.
     */
    app.use(
      '/api/v1/collect',
      express.text({
        type: 'text/plain',
        limit: '64kb',
      }),
    );

    app.setGlobalPrefix(
      'api/v1',
    );

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted:
          true,
        transform: true,
      }),
    );

    /*
     * Keep your existing CORS and Swagger
     * configuration here.
     */

    const port =
      Number(
        process.env.PORT,
      ) || 4000;

    await app.listen(port);
  }

  void bootstrap();
  const swaggerConfig = new DocumentBuilder()
    .setTitle('SaaS Command Center API')
    .setDescription('Project Visibility MVP API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/v1/docs', app, swaggerDocument, {
    customSiteTitle: 'Command Center API Docs',
  });

  await app.listen(apiPort, '0.0.0.0');
  logger.log(`API running at http://localhost:${apiPort}/api/v1`);
  logger.log(`Swagger running at http://localhost:${apiPort}/api/v1/docs`);
}

void bootstrap();
