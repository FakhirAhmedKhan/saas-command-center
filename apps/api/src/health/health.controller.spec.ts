import { HealthController } from './health.controller';
import type { HealthService } from './health.service';
import { HttpStatus } from '@nestjs/common';
import type { Response } from 'express';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: jest.Mocked<Pick<HealthService, 'getHealth'>>;
  let response: Pick<Response, 'status'>;

  beforeEach(() => {
    healthService = {
      getHealth: jest.fn(),
    };

    response = {
      status: jest.fn().mockReturnThis(),
    };

    controller = new HealthController(healthService as HealthService);
  });

  it('returns healthy response without changing the HTTP status', async () => {
    const health = {
      status: 'ok' as const,
      timestamp: '2026-08-12T00:00:00.000Z',
      database: {
        status: 'ok' as const,
      },
    };

    healthService.getHealth.mockResolvedValue(health);

    const result = await controller.getHealth(response as Response);

    expect(result).toEqual(health);
    expect(response.status).not.toHaveBeenCalled();
  });

  it('returns 503 when health status is error', async () => {
    const health = {
      status: 'error' as const,
      timestamp: '2026-08-12T00:00:00.000Z',
      database: {
        status: 'error' as const,
      },
    };

    healthService.getHealth.mockResolvedValue(health);

    const result = await controller.getHealth(response as Response);

    expect(result).toEqual(health);
    expect(response.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(response.status).toHaveBeenCalledTimes(1);
  });
});
