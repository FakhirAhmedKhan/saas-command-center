import { HealthService } from './health.service';
import { Public } from '../modules/auth/decorators/public.decorator';
import type { HealthResponse } from '@command-center/shared-types';
import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

@Public()
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
  async getHealth(@Res({ passthrough: true }) response: Response): Promise<HealthResponse> {
    const health = await this.healthService.getHealth();

    if (health.status === 'error') {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return health;
  }
}
