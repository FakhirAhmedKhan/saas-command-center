// @vitest-environment jsdom
import { HealthStatusBadge } from '@/features/monitoring/health-status-badge';
import type { HealthCheckStatus } from '@/features/monitoring/monitoring.types';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('HealthStatusBadge', () => {
  const cases: Array<{ status: HealthCheckStatus; label: string; colorClass: string }> = [
    { status: 'HEALTHY', label: 'Healthy', colorClass: 'text-emerald-700' },
    { status: 'DEGRADED', label: 'Degraded', colorClass: 'text-amber-700' },
    { status: 'DOWN', label: 'Down', colorClass: 'text-red-700' },
    { status: 'UNKNOWN', label: 'Unknown', colorClass: 'text-slate-700' },
    { status: 'DISABLED', label: 'Disabled', colorClass: 'text-slate-500' },
  ];

  it.each(cases)('renders "$label" with its status-specific color class for status $status', ({ status, label, colorClass }) => {
    render(<HealthStatusBadge status={status} />);

    const badge = screen.getByText(label);

    expect(badge).toHaveClass(colorClass);
  });

  it('renders visually distinct classes for DOWN versus HEALTHY so a critical status cannot be mistaken for a healthy one', () => {
    const { rerender } = render(<HealthStatusBadge status='DOWN' />);
    const downClassName = screen.getByText('Down').className;

    rerender(<HealthStatusBadge status='HEALTHY' />);
    const healthyClassName = screen.getByText('Healthy').className;

    expect(downClassName).not.toBe(healthyClassName);
  });
});
