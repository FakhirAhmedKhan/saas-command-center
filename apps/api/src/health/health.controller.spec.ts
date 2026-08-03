import { HttpStatus } from '@nestjs/common';
import type { HealthResponse } from '@command-center/shared-types';
import type { Response } from 'express';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  const healthyResponse: HealthResponse = {
    status: 'ok',
    service: 'command-center-api',
    version: '0.1.0',
    environment: 'test',
    timestamp: new Date().toISOString(),
    database: {
      status: 'up',
      responseTimeMs: 2,
    },
  };

  it('returns healthy API and database status', async () => {
    const healthService = {
      getHealth: jest.fn().mockResolvedValue(healthyResponse),
    } as unknown as HealthService;

    const response = {
      status: jest.fn(),
    } as unknown as Response;

    const controller = new HealthController(healthService);

    const result = await controller.getHealth(response);

    expect(result.status).toBe('ok');
    expect(result.database.status).toBe('up');
    expect(response.status).not.toHaveBeenCalled();
  });

  it('returns HTTP 503 when database is unavailable', async () => {
    const unhealthyResponse: HealthResponse = {
      ...healthyResponse,
      status: 'error',
      database: {
        status: 'down',
        responseTimeMs: 10,
      },
    };

    const healthService = {
      getHealth: jest.fn().mockResolvedValue(unhealthyResponse),
    } as unknown as HealthService;

    const response = {
      status: jest.fn(),
    } as unknown as Response;

    const controller = new HealthController(healthService);

    const result = await controller.getHealth(response);

    expect(result.status).toBe('error');
    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  });
});