import type {
  INestApplication,
} from '@nestjs/common';

import {
  Test,
} from '@nestjs/testing';

import type {
  TestingModule,
} from '@nestjs/testing';

import {
  AppModule,
} from '../../src/app.module';

import {
  configureApplication,
} from '../../src/bootstrap/configure-application';

export interface TestApplication {
  app: INestApplication;
  moduleRef: TestingModule;
}

export async function createTestApplication():
  Promise<TestApplication> {
  const moduleRef =
    await Test
      .createTestingModule({
        imports: [
          AppModule,
        ],
      })
      .compile();

  const app =
    moduleRef
      .createNestApplication({
        bodyParser: false,
      });

  configureApplication(
    app,
    {
      enableSwagger:
        false,
    },
  );

  await app.init();

  return {
    app,
    moduleRef,
  };
}