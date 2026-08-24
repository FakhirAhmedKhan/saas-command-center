import { HealthController } from 'src/modules/health/health.controller';
import type { HealthService } from 'src/modules/health/health.service';

describe('HealthController', () => {
  function createController(service: Partial<HealthService>): HealthController {
    return new HealthController(service as HealthService);
  }

  it('returns a public liveness payload without touching the database', () => {
    const getReadiness = jest.fn();
    const controller = createController({
      getPublicHealth: jest.fn().mockReturnValue({
        status: 'ok',
        timestamp: '2026-08-07T01:18:43.237Z',
      }),

      getReadiness,
    });
    const result = controller.getPublicHealth();

    expect(result).toEqual({
      status: 'ok',
      timestamp: '2026-08-07T01:18:43.237Z',
    });

    expect(getReadiness).not.toHaveBeenCalled();
  });

  it('delegates readiness checks to HealthService', async () => {
    const readiness = {
      status: 'ready' as const,
      service: 'command-center-api',
      version: '0.1.0',
      environment: 'test',
      timestamp: '2026-08-07T01:18:43.237Z',
      database: {
        status: 'up' as const,
        responseTimeMs: 12,
      },
    };
    const controller = createController({
      getReadiness: jest.fn().mockResolvedValue(readiness),
    });

    await expect(controller.getReadiness()).resolves.toEqual(readiness);
  });

  it('propagates a readiness failure instead of swallowing it', async () => {
    const failure = new Error('Database is unavailable.');
    const controller = createController({
      getReadiness: jest.fn().mockRejectedValue(failure),
    });

    await expect(controller.getReadiness()).rejects.toThrow(failure);
  });
});
