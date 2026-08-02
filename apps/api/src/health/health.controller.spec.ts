import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns an ok health response', () => {
    const controller = new HealthController();
    const result = controller.getHealth();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('command-center-api');
    expect(result.timestamp).toBeTruthy();
  });
});
