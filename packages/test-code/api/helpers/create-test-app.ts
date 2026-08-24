import { type INestApplication } from '@nestjs/common';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { configureApplication } from 'src/bootstrap/configure-application';

export async function createTestApp(): Promise<INestApplication> {
  const testingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = testingModule.createNestApplication<NestExpressApplication>();

  /*
   * Boot the same way production does so E2E exercises the real filters,
   * request-id middleware, helmet, CORS and body limits.
   *
   * Swagger defaults to enabled outside production; skip the document build
   * so each suite does not pay for it.
   */
  configureApplication(app, {
    enableSwagger: false,
  });

  await app.init();

  return app;
}
