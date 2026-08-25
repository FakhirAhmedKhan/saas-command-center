import type { INestApplication } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, type TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { configureApplication } from 'src/bootstrap/configure-application';

export interface TestApplication {
  app: INestApplication;
  moduleRef: TestingModule;
}

export async function createTestApplication(): Promise<TestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), {
    rawBody: true,
  });

  configureApplication(app, {
    enableSwagger: false,
  });

  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  return {
    app,
    moduleRef,
  };
}
