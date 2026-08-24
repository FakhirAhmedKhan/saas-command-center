// @vitest-environment jsdom
import type { SaasApplication } from '@/features/applications/application-types';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApplicationForm } from '@/features/applications/components/application-form';

function baseApplication(overrides: Partial<SaasApplication> = {}): SaasApplication {
  return {
    id: 'app-1',
    workspaceId: 'workspace-1',
    name: 'PriceScout AI',
    slug: 'pricescout-ai',
    type: 'WEB',
    shortDescription: 'Short desc',
    longDescription: 'Long desc',
    category: 'AI',
    status: 'IN_DEVELOPMENT',
    priority: 'HIGH',
    startedAt: '2026-01-01T00:00:00.000Z',
    targetLaunchAt: '2026-06-01T00:00:00.000Z',
    launchedAt: null,
    lastActivityAt: null,
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    progressPercent: 0,
    progressUpdatedAt: null,
    technologies: [],
    links: [],
    ...overrides,
  };
}

describe('ApplicationForm validation', () => {
  it('blocks submission and shows an alert when the name is shorter than two characters after trimming', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<ApplicationForm cancelHref='/workspaces/workspace-1/applications' submitLabel='Create application' onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Application name'), ' a ');
    await user.click(screen.getByRole('button', { name: 'Create application' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Application name must contain at least two characters.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not render an alert before the form is submitted', () => {
    render(<ApplicationForm cancelHref='/workspaces/workspace-1/applications' submitLabel='Create application' onSubmit={vi.fn()} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('ApplicationForm submission payload', () => {
  it('submits a trimmed, normalized payload with defaults for a brand-new application', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<ApplicationForm cancelHref='/workspaces/workspace-1/applications' submitLabel='Create application' onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Application name'), '  PriceScout AI  ');
    await user.click(screen.getByRole('button', { name: 'Create application' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'PriceScout AI',
      slug: undefined,
      shortDescription: null,
      longDescription: null,
      category: 'SAAS',
      status: 'IDEA',
      priority: 'MEDIUM',
      startedAt: null,
      targetLaunchAt: null,
      launchedAt: null,
    });
  });

  it('sends undefined slug when left blank, and trims a provided slug', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<ApplicationForm cancelHref='/workspaces/workspace-1/applications' submitLabel='Create application' onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Application name'), 'App');
    await user.type(screen.getByLabelText('Slug'), '  my-slug  ');
    await user.click(screen.getByRole('button', { name: 'Create application' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ slug: 'my-slug' }));
  });

  it('converts a date-only input into an ISO UTC-midnight timestamp for the API', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<ApplicationForm cancelHref='/workspaces/workspace-1/applications' submitLabel='Create application' onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Application name'), 'App');

    const startDateInput = screen.getByLabelText('Start date');

    await user.clear(startDateInput);
    await user.type(startDateInput, '2026-03-15');

    await user.click(screen.getByRole('button', { name: 'Create application' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ startedAt: '2026-03-15T00:00:00.000Z' }));
  });

  it('pre-fills fields from an existing application and submits its edited values', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const application = baseApplication();

    render(<ApplicationForm application={application} cancelHref='/workspaces/workspace-1/applications' submitLabel='Save changes' onSubmit={onSubmit} />);

    expect(screen.getByLabelText('Application name')).toHaveValue('PriceScout AI');
    expect(screen.getByLabelText('Category')).toHaveValue('AI');
    expect(screen.getByLabelText('Status')).toHaveValue('IN_DEVELOPMENT');
    expect(screen.getByLabelText('Priority')).toHaveValue('HIGH');

    await user.selectOptions(screen.getByLabelText('Status'), 'LIVE');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: 'PriceScout AI', status: 'LIVE', category: 'AI', priority: 'HIGH' }));
  });

  it('shows the submit-error message returned by onSubmit and keeps the form interactive', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error('Application slug already exists'));

    render(<ApplicationForm cancelHref='/workspaces/workspace-1/applications' submitLabel='Create application' onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Application name'), 'App');
    await user.click(screen.getByRole('button', { name: 'Create application' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Application slug already exists');
    expect(screen.getByRole('button', { name: 'Create application' })).not.toBeDisabled();
  });

  it('renders a Cancel link pointing at the provided cancelHref', () => {
    render(<ApplicationForm cancelHref='/workspaces/workspace-1/applications' submitLabel='Create application' onSubmit={vi.fn()} />);

    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/workspaces/workspace-1/applications');
  });
});
