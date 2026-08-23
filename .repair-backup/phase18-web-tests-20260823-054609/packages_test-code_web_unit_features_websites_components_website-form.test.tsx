// @vitest-environment jsdom
import { WebsiteForm } from '@/features/websites/components/website-form';
import type { Website } from '@/features/websites/website-types';
import type { SaasApplication } from '@/features/applications/application-types';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

function makeApplication(overrides: Partial<SaasApplication> = {}): SaasApplication {
  return {
    id: 'app-1',
    workspaceId: 'workspace-1',
    name: 'PriceScout AI',
    slug: 'pricescout-ai',
    shortDescription: null,
    longDescription: null,
    category: 'AI',
    status: 'LIVE',
    priority: 'HIGH',
    startedAt: null,
    targetLaunchAt: null,
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

function makeWebsite(overrides: Partial<Website> = {}): Website {
  return {
    id: 'site-1',
    workspaceId: 'workspace-1',
    applicationId: 'app-1',
    name: 'Command Center Web',
    domain: 'command-center.example.com',
    timeZone: 'UTC',
    enabled: true,
    allowedOrigins: ['https://command-center.example.com'],
    trackingKeyPrefix: 'ctk_abcd',
    lastEventAt: null,
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as Website;
}

describe('WebsiteForm validation', () => {
  it('blocks submission and shows an alert when the name is too short', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<WebsiteForm applications={[]} cancelHref='/workspaces/workspace-1/websites' submitLabel='Create website' onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Website name'), 'a');
    await user.type(screen.getByLabelText('Domain'), 'example.com');
    await user.click(screen.getByRole('button', { name: 'Create website' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Website name must contain at least two characters.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('blocks submission and shows an alert when the domain is blank', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<WebsiteForm applications={[]} cancelHref='/workspaces/workspace-1/websites' submitLabel='Create website' onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Website name'), 'My Site');

    // Domain is left blank (its default value). Bypass the native HTML5 "required" constraint
    // (which would otherwise stop the click before React's handler runs) to exercise the
    // component's own domain-blank validation branch, mirroring the e2e suite's technique.
    screen.getByLabelText('Domain').closest('form')!.noValidate = true;

    await user.click(screen.getByRole('button', { name: 'Create website' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Website domain is required.');
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('WebsiteForm submission payload', () => {
  it('submits a trimmed payload with parsed origins and a null applicationId when not connected', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<WebsiteForm applications={[]} cancelHref='/workspaces/workspace-1/websites' submitLabel='Create website' onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Website name'), '  MadadAI Web  ');
    await user.type(screen.getByLabelText('Domain'), 'madadai.example.com');

    const timeZoneInput = screen.getByLabelText('Reporting time zone');

    await user.clear(timeZoneInput);
    await user.type(timeZoneInput, 'Asia/Dubai');

    fireEvent.change(screen.getByLabelText('Allowed origins'), {
      target: { value: 'https://madadai.example.com\nhttps://madadai.example.com\nhttp://localhost:3000' },
    });

    await user.click(screen.getByRole('button', { name: 'Create website' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'MadadAI Web',
      domain: 'madadai.example.com',
      timeZone: 'Asia/Dubai',
      enabled: true,
      applicationId: null,
      allowedOrigins: ['https://madadai.example.com', 'http://localhost:3000'],
    });
  });

  it('includes the selected application id and honours the initialApplicationId default', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const application = makeApplication();

    render(
      <WebsiteForm
        applications={[application]}
        initialApplicationId={application.id}
        cancelHref='/workspaces/workspace-1/websites'
        submitLabel='Create website'
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByLabelText('SaaS application')).toHaveValue(application.id);

    await user.type(screen.getByLabelText('Website name'), 'Site');
    await user.type(screen.getByLabelText('Domain'), 'site.example.com');
    await user.click(screen.getByRole('button', { name: 'Create website' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ applicationId: application.id }));
  });

  it('sends an unchecked enable-tracking toggle as enabled: false', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<WebsiteForm applications={[]} cancelHref='/workspaces/workspace-1/websites' submitLabel='Create website' onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Website name'), 'Site');
    await user.type(screen.getByLabelText('Domain'), 'site.example.com');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Create website' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('pre-fills fields from an existing website, including newline-joined origins', () => {
    const website = makeWebsite({ allowedOrigins: ['https://a.example.com', 'https://b.example.com'] });

    render(<WebsiteForm website={website} applications={[]} cancelHref='/workspaces/workspace-1/websites' submitLabel='Save changes' onSubmit={vi.fn()} />);

    expect(screen.getByLabelText('Website name')).toHaveValue('Command Center Web');
    expect(screen.getByLabelText('Domain')).toHaveValue('command-center.example.com');
    expect(screen.getByLabelText('Allowed origins')).toHaveValue('https://a.example.com\nhttps://b.example.com');
  });

  it('shows the submit-error message returned by onSubmit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error('Website domain already exists'));

    render(<WebsiteForm applications={[]} cancelHref='/workspaces/workspace-1/websites' submitLabel='Create website' onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Website name'), 'Site');
    await user.type(screen.getByLabelText('Domain'), 'command-center.example.com');
    await user.click(screen.getByRole('button', { name: 'Create website' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Website domain already exists');
  });
});
