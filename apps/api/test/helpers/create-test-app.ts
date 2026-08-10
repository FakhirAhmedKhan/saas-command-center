import { AppModule } from '../../src/app.module';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';

export async function createTestApp(): Promise<INestApplication> {
  const testingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = testingModule.createNestApplication<NestExpressApplication>();

  const expressInstance = app.getHttpAdapter().getInstance();

  expressInstance.set('trust proxy', 1);

  app.use(cookieParser());

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,

      forbidNonWhitelisted: true,

      transform: true,

      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.init();

  return app;
}
