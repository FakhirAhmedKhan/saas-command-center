import {
  Controller,
  Get,
  HttpStatus,
  Res,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { HealthResponse } from '@command-center/shared-types';
import type { Response } from 'express';
import { HealthService } from './health.service';

@ApiTags('System')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Check API and database health',
  })
  @ApiOkResponse({
    description: 'The API and database are healthy.',
  })
  @ApiServiceUnavailableResponse({
    description: 'The API is running but the database is unavailable.',
  })
  async getHealth(
    @Res({ passthrough: true }) response: Response,
  ): Promise<HealthResponse> {
    const health = await this.healthService.getHealth();

    if (health.status === 'error') {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return health;
  }
}