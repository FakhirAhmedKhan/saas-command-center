import {
  createHealthCheck,
  getHealthCheckHistory,
  getHealthChecks,
  getHealthIncidents,
  getMonitoringSummary,
  getMonitoringTargets,
  runHealthCheckNow,
  updateHealthCheck,
} from '@/features/monitoring/monitoring-api';
import { apiRequest } from '@/features/lib/api/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/lib/api/api-client', () => ({
  apiRequest: vi.fn(),
}));

const apiRequestMock = vi.mocked(apiRequest);

const WORKSPACE = 'workspace-1';
const BASE = `/workspaces/${WORKSPACE}/monitoring`;

beforeEach(() => {
  apiRequestMock.mockReset();
});

describe('monitoring-api read operations', () => {
  it('gets the monitoring summary', async () => {
    apiRequestMock.mockResolvedValue({});

    await getMonitoringSummary(WORKSPACE);

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/summary`, { method: 'GET', signal: undefined });
  });

  it('gets monitoring targets', async () => {
    apiRequestMock.mockResolvedValue([]);

    await getMonitoringTargets(WORKSPACE);

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/targets`, { method: 'GET', signal: undefined });
  });

  it('gets health checks', async () => {
    apiRequestMock.mockResolvedValue([]);

    await getHealthChecks(WORKSPACE);

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/checks`, { method: 'GET', signal: undefined });
  });

  it('gets history for a specific health check', async () => {
    apiRequestMock.mockResolvedValue([]);

    await getHealthCheckHistory(WORKSPACE, 'check-1');

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/checks/check-1/history`, { method: 'GET', signal: undefined });
  });

  it('gets health incidents', async () => {
    apiRequestMock.mockResolvedValue([]);

    await getHealthIncidents(WORKSPACE);

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/incidents`, { method: 'GET', signal: undefined });
  });

  it('forwards an abort signal on reads', async () => {
    apiRequestMock.mockResolvedValue([]);
    const controller = new AbortController();

    await getHealthChecks(WORKSPACE, controller.signal);

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/checks`, { method: 'GET', signal: controller.signal });
  });
});

describe('monitoring-api write operations', () => {
  it('creates a health check with a POST carrying the input as the body', async () => {
    apiRequestMock.mockResolvedValue({});
    const input = { name: 'API uptime', targetId: 'target-1', intervalSeconds: 60 } as never;

    await createHealthCheck(WORKSPACE, input);

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/checks`, { method: 'POST', body: input });
  });

  it('updates a health check with a PATCH to its id', async () => {
    apiRequestMock.mockResolvedValue({});
    const input = { intervalSeconds: 120 } as never;

    await updateHealthCheck(WORKSPACE, 'check-1', input);

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/checks/check-1`, { method: 'PATCH', body: input });
  });

  it('triggers an immediate run via POST /run', async () => {
    apiRequestMock.mockResolvedValue(undefined);

    await runHealthCheckNow(WORKSPACE, 'check-1');

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/checks/check-1/run`, { method: 'POST' });
  });
});
