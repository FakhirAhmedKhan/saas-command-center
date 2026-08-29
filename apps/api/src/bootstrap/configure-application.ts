import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { getAllowedOrigins, type TypedConfigService } from '../config/runtime-config';
import fastifyCookie from '@fastify/cookie';
import fastifyHelmet from '@fastify/helmet';
import { Logger, ValidationPipe, type INestApplication } from '@nestjs/common';
import type { CorsOptionsDelegate } from '@nestjs/common/interfaces/external/cors-options.interface';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { FastifyInstance, FastifyRequest } from 'fastify';

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
  const corsOptionsDelegate: CorsOptionsDelegate<FastifyRequest> = (request, callback) => {
    const requestPath = (request.raw.url ?? request.url ?? '').split('?')[0];

    /*
     * The analytics collector performs its own tracking-key and
     * Website.allowedOrigins validation.
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

  app.enableCors(() => corsOptionsDelegate);
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
  const fastify = app.getHttpAdapter().getInstance() as FastifyInstance;

  /*
   * Queue plugins before app.init()/app.listen().
   * Fastify completes plugin registration during initialization.
   */
  fastify.register(fastifyCookie);

  fastify.register(fastifyHelmet, {
    global: true,
    contentSecurityPolicy:
      config.get('NODE_ENV', {
        infer: true,
      }) === 'production',
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
  });

  fastify.addHook('onRequest', (request, reply, done) => {
    reply.header('X-Request-Id', request.id);
    done();
  });

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
