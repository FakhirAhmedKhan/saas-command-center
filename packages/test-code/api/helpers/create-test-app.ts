import { type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import type { IncomingMessage } from 'node:http';
import type { Http2ServerRequest } from 'node:http2';
import { AppModule } from 'src/app.module';
import { configureApplication } from 'src/bootstrap/configure-application';
import { createRequestId, REQUEST_ID_HEADER } from 'src/common/middleware/request-id.middleware';
import { parseBodyLimit, type TypedConfigService } from 'src/config/runtime-config';

export async function createTestApp(): Promise<INestApplication> {
  const testingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const config = testingModule.get<TypedConfigService>(ConfigService);
  const app = testingModule.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter({
      bodyLimit: parseBodyLimit(
        config.get('BODY_LIMIT', {
          infer: true,
        }),
      ),
      genReqId: (request: IncomingMessage | Http2ServerRequest) => createRequestId(request.headers[REQUEST_ID_HEADER]),
    }),
  );

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
  await app.getHttpAdapter().getInstance().ready();

  return app;
}
