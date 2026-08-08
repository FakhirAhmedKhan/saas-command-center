import { Controller, Get } from '@nestjs/common';

import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';

import { PublicHealthResponseDto, ReadinessResponseDto } from './dto/health-response.dto';

import { HealthService } from './health.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Public application liveness check',
  })
  @ApiOkResponse({
    type: PublicHealthResponseDto,
  })
  getPublicHealth(): PublicHealthResponseDto {
    return this.healthService.getPublicHealth();
  }

  @Get('readiness')
  @ApiOperation({
    summary: 'Protected application readiness diagnostics',
  })
  @ApiOkResponse({
    type: ReadinessResponseDto,
  })
  @ApiServiceUnavailableResponse({
    description: 'A required dependency is unavailable.',
  })
  getReadiness(): Promise<ReadinessResponseDto> {
    return this.healthService.getReadiness();
  }
}
