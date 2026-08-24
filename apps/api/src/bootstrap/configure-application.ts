import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { requestIdMiddleware } from '../common/middleware/request-id.middleware';
import { getAllowedOrigins, parseTrustProxy, type TypedConfigService } from '../config/runtime-config';
import { Logger, ValidationPipe, type INestApplication } from '@nestjs/common';
import type { CorsOptionsDelegate } from '@nestjs/common/interfaces/external/cors-options.interface';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { json, text, urlencoded, type Express, type Request } from 'express';
import helmet from 'helmet';

export interface ConfigureApplicationOptions {
  enableSwagger?: boolean;
}

function configureCors(app: INestApplication, config: TypedConfigService): void {
  const allowedOrigins = getAllowedOrigins(config);
  const commonOptions = {
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id', 'X-Workspace-Id'],
    exposedHeaders: ['X-Request-Id'],
  };
  const corsOptionsDelegate: CorsOptionsDelegate<Request> = (request, callback) => {
    const requestPath = (request.originalUrl ?? request.url ?? '').split('?')[0];

    /*
     * Tracker requests intentionally use fetch(..., { mode: 'no-cors' }).
     *
     * Do not apply the dashboard/API CORS allowlist to the public analytics
     * collector. Analytics ingestion authenticates the tracking key and then
     * validates Origin against Website.allowedOrigins.
     */
    if (requestPath === '/api/v1/collect') {
      callback(null, {
        ...commonOptions,
        credentials: false,
        origin: false,
      });

      return;
    }

    const origin = request.headers.origin;

    if (!origin || allowedOrigins.has(origin)) {
      callback(null, {
        ...commonOptions,
        credentials: true,
        origin: true,
      });

      return;
    }

    callback(new Error(`Origin ${origin} is not allowed by CORS.`), {
      ...commonOptions,
      credentials: false,
      origin: false,
    });
  };

  app.enableCors(corsOptionsDelegate);
}
function configureSwagger(app: INestApplication): void {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('SaaS Command Center API')
    .setDescription('Backend API for SaaS Command Center.')
    .setVersion('0.1.0')
    .addBearerAuth()
    .addCookieAuth('command_center_refresh_token')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('api/v1/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}

export function configureApplication(app: INestApplication, options: ConfigureApplicationOptions = {}): void {
  const logger = new Logger('ApplicationBootstrap');
  const config = app.get<TypedConfigService>(ConfigService);
  const expressApplication = app.getHttpAdapter().getInstance() as Express;

  expressApplication.set(
    'trust proxy',
    parseTrustProxy(
      config.get('TRUST_PROXY', {
        infer: true,
      }),
    ),
  );

  app.use(requestIdMiddleware);

  app.use(
    helmet({
      contentSecurityPolicy:
        config.get('NODE_ENV', {
          infer: true,
        }) === 'production',

      crossOriginResourcePolicy: {
        policy: 'cross-origin',
      },
    }),
  );

  app.use(cookieParser());

  const bodyLimit = config.get('BODY_LIMIT', {
    infer: true,
  });

  app.use(
    text({
      type: 'text/plain',
      limit: bodyLimit,
    }),
  );

  app.use(
    json({
      limit: bodyLimit,
    }),
  );

  app.use(
    urlencoded({
      extended: true,
      limit: bodyLimit,
    }),
  );

  configureCors(app, config);

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      stopAtFirstError: false,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableShutdownHooks();

  const swaggerEnabled =
    options.enableSwagger ??
    config.get('SWAGGER_ENABLED', {
      infer: true,
    });

  if (swaggerEnabled) {
    configureSwagger(app);

    logger.log('Swagger enabled at /api/v1/docs');
  }
}
