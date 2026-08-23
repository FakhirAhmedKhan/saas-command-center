// @vitest-environment jsdom
import { ApplicationCard } from '@/features/applications/components/application-card';
import type { ApplicationTechnology, SaasApplication } from '@/features/applications/application-types';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

function makeTechnology(id: string, name: string): ApplicationTechnology {
  return {
    id,
    applicationId: 'app-1',
    name,
    type: 'FRONTEND',
    version: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function makeApplication(overrides: Partial<SaasApplication> = {}): SaasApplication {
  return {
    id: 'app-1',
    workspaceId: 'workspace-1',
    name: 'PriceScout AI',
    slug: 'pricescout-ai',
    type: 'WEB',
    shortDescription: 'Track competitor prices',
    longDescription: null,
    category: 'AI',
    status: 'IN_DEVELOPMENT',
    priority: 'HIGH',
    startedAt: null,
    targetLaunchAt: null,
    launchedAt: null,
    lastActivityAt: null,
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    progressPercent: 40,
    progressUpdatedAt: null,
    technologies: [],
    links: [],
    ...overrides,
  };
}

describe('ApplicationCard technology overflow', () => {
  it('shows every technology name without an overflow badge when 4 or fewer are present', () => {
    const application = makeApplication({
      technologies: [makeTechnology('t1', 'Next.js'), makeTechnology('t2', 'Prisma'), makeTechnology('t3', 'Postgres'), makeTechnology('t4', 'Redis')],
    });

    render(<ApplicationCard workspaceId='workspace-1' application={application} />);

    expect(screen.getByText('Next.js')).toBeInTheDocument();
    expect(screen.getByText('Redis')).toBeInTheDocument();
    expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument();
  });

  it('caps visible technologies at 4 and shows a "+N" badge for the remainder', () => {
    const application = makeApplication({
      technologies: [
        makeTechnology('t1', 'Next.js'),
        makeTechnology('t2', 'Prisma'),
        makeTechnology('t3', 'Postgres'),
        makeTechnology('t4', 'Redis'),
        makeTechnology('t5', 'Docker'),
        makeTechnology('t6', 'Kubernetes'),
      ],
    });

    render(<ApplicationCard workspaceId='workspace-1' application={application} />);

    expect(screen.getByText('Next.js')).toBeInTheDocument();
    expect(screen.getByText('Redis')).toBeInTheDocument();
    expect(screen.queryByText('Docker')).not.toBeInTheDocument();
    expect(screen.queryByText('Kubernetes')).not.toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('omits the tech stack section entirely when there are no technologies', () => {
    render(<ApplicationCard workspaceId='workspace-1' application={makeApplication({ technologies: [] })} />);

    expect(screen.queryByText('Tech stack')).not.toBeInTheDocument();
  });
});

describe('ApplicationCard archived and description states', () => {
  it('shows an Archived badge only when archivedAt is set', () => {
    const { rerender } = render(<ApplicationCard workspaceId='workspace-1' application={makeApplication({ archivedAt: null })} />);

    expect(screen.queryByText('Archived')).not.toBeInTheDocument();

    rerender(<ApplicationCard workspaceId='workspace-1' application={makeApplication({ archivedAt: '2026-01-01T00:00:00.000Z' })} />);

    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('falls back to a placeholder message when shortDescription is null', () => {
    render(<ApplicationCard workspaceId='workspace-1' application={makeApplication({ shortDescription: null })} />);

    expect(screen.getByText('No description has been added yet.')).toBeInTheDocument();
  });

  it('links to the application detail route for the given workspace', () => {
    render(<ApplicationCard workspaceId='workspace-42' application={makeApplication({ id: 'app-7' })} />);

    expect(screen.getByRole('link', { name: /view application/i })).toHaveAttribute('href', '/workspaces/workspace-42/applications/app-7');
  });

  it('renders the link count from the application links array', () => {
    render(
      <ApplicationCard
        workspaceId='workspace-1'
        application={makeApplication({
          links: [
            { id: 'l1', applicationId: 'app-1', label: 'Prod', type: 'PRODUCTION', url: 'https://a.com', createdAt: '', updatedAt: '' },
            { id: 'l2', applicationId: 'app-1', label: 'Docs', type: 'DOCUMENTATION', url: 'https://b.com', createdAt: '', updatedAt: '' },
          ],
        })}
      />,
    );

    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
