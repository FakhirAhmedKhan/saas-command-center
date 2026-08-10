import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApplication } from './bootstrap/configure-application';
import { assertStartupRequirements } from './bootstrap/startup-checks';
import type { TypedConfigService } from './config/runtime-config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    bufferLogs: true,
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
