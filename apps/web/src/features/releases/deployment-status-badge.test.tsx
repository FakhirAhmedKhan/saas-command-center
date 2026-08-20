// @vitest-environment jsdom
import { DeploymentStatusBadge } from './deployment-status-badge';
import type { DeploymentStatus } from './release-management.types';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('DeploymentStatusBadge', () => {
  const cases: Array<{ status: DeploymentStatus; text: string; colorClass: string }> = [
    { status: 'DRAFT', text: 'DRAFT', colorClass: 'text-slate-700' },
    { status: 'SCHEDULED', text: 'SCHEDULED', colorClass: 'text-purple-700' },
    { status: 'IN_PROGRESS', text: 'IN PROGRESS', colorClass: 'text-blue-700' },
    { status: 'SUCCESSFUL', text: 'SUCCESSFUL', colorClass: 'text-emerald-700' },
    { status: 'FAILED', text: 'FAILED', colorClass: 'text-red-700' },
    { status: 'ROLLED_BACK', text: 'ROLLED BACK', colorClass: 'text-amber-700' },
  ];

  it.each(cases)('replaces underscores with spaces and applies the status color for $status', ({ status, text, colorClass }) => {
    render(<DeploymentStatusBadge status={status} />);

    const badge = screen.getByText(text);

    expect(badge).toHaveClass(colorClass);
  });

  it('renders distinct classes for FAILED versus SUCCESSFUL so a failed deployment cannot read as successful', () => {
    const { rerender } = render(<DeploymentStatusBadge status='FAILED' />);
    const failedClassName = screen.getByText('FAILED').className;

    rerender(<DeploymentStatusBadge status='SUCCESSFUL' />);
    const successfulClassName = screen.getByText('SUCCESSFUL').className;

    expect(failedClassName).not.toBe(successfulClassName);
  });
});
