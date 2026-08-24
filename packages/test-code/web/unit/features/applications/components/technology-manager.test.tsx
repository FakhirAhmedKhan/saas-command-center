// @vitest-environment jsdom
import type { ApplicationTechnology } from '@/features/applications/application-types';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addApplicationTechnology, removeApplicationTechnology, updateApplicationTechnology } from '@/features/applications/application-api';
import { TechnologyManager } from '@/features/applications/components/technology-manager';

vi.mock('@/features/applications/application-api', () => ({
  addApplicationTechnology: vi.fn(),
  updateApplicationTechnology: vi.fn(),
  removeApplicationTechnology: vi.fn(),
}));

const mockedAdd = vi.mocked(addApplicationTechnology);
const mockedUpdate = vi.mocked(updateApplicationTechnology);
const mockedRemove = vi.mocked(removeApplicationTechnology);
const WORKSPACE_ID = 'workspace-1';
const APPLICATION_ID = 'application-1';

function makeTechnology(overrides: Partial<ApplicationTechnology> = {}): ApplicationTechnology {
  return {
    id: 'tech-1',
    applicationId: APPLICATION_ID,
    name: 'Next.js',
    type: 'FRONTEND',
    version: '16',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  mockedAdd.mockReset().mockResolvedValue(makeTechnology());
  mockedUpdate.mockReset().mockResolvedValue(makeTechnology());
  mockedRemove.mockReset().mockResolvedValue({ message: 'ok' });
  vi.restoreAllMocks();
});

describe('TechnologyManager add flow', () => {
  it('shows a validation error and does not call the API when the name is blank', async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();

    render(<TechnologyManager workspaceId={WORKSPACE_ID} applicationId={APPLICATION_ID} technologies={[]} onChanged={onChanged} />);

    await user.click(screen.getByRole('button', { name: /add/i }));

    expect(screen.getByText('Technology name is required.')).toBeInTheDocument();
    expect(mockedAdd).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('calls addApplicationTechnology with a trimmed name, selected type, and null version when left blank', async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();

    render(<TechnologyManager workspaceId={WORKSPACE_ID} applicationId={APPLICATION_ID} technologies={[]} onChanged={onChanged} />);

    await user.type(screen.getByLabelText('Technology name'), '  PostgreSQL  ');
    await user.selectOptions(screen.getByLabelText('Technology type'), 'DATABASE');
    await user.click(screen.getByRole('button', { name: /add/i }));

    expect(mockedAdd).toHaveBeenCalledWith(WORKSPACE_ID, APPLICATION_ID, {
      name: 'PostgreSQL',
      type: 'DATABASE',
      version: null,
    });

    expect(await screen.findByLabelText('Technology name')).toHaveValue('');
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('trims a provided version instead of nulling it', async () => {
    const user = userEvent.setup();

    render(<TechnologyManager workspaceId={WORKSPACE_ID} applicationId={APPLICATION_ID} technologies={[]} onChanged={vi.fn()} />);

    await user.type(screen.getByLabelText('Technology name'), 'Next.js');
    await user.type(screen.getByLabelText('Technology version'), '  16.1  ');
    await user.click(screen.getByRole('button', { name: /add/i }));

    expect(mockedAdd).toHaveBeenCalledWith(WORKSPACE_ID, APPLICATION_ID, expect.objectContaining({ version: '16.1' }));
  });

  it('shows the API error message when adding a technology fails', async () => {
    const user = userEvent.setup();
    mockedAdd.mockRejectedValueOnce(new Error('Technology already tracked'));

    render(<TechnologyManager workspaceId={WORKSPACE_ID} applicationId={APPLICATION_ID} technologies={[]} onChanged={vi.fn()} />);

    await user.type(screen.getByLabelText('Technology name'), 'Next.js');
    await user.click(screen.getByRole('button', { name: /add/i }));

    expect(await screen.findByText('Technology already tracked')).toBeInTheDocument();
  });
});

describe('TechnologyManager edit flow', () => {
  it('pre-fills the form from the technology being edited and calls updateApplicationTechnology, not addApplicationTechnology', async () => {
    const user = userEvent.setup();
    const technology = makeTechnology({ id: 'tech-9', name: 'Redis', type: 'INFRASTRUCTURE', version: '7' });

    render(<TechnologyManager workspaceId={WORKSPACE_ID} applicationId={APPLICATION_ID} technologies={[technology]} onChanged={vi.fn()} />);

    const rowButtons = within(screen.getByText('Version 7').closest('.flex.flex-col')!).getAllByRole('button');

    await user.click(rowButtons[0]!);

    expect(screen.getByLabelText('Technology name')).toHaveValue('Redis');
    expect(screen.getByLabelText('Technology version')).toHaveValue('7');

    await user.click(screen.getByRole('button', { name: /update/i }));

    expect(mockedUpdate).toHaveBeenCalledWith(WORKSPACE_ID, APPLICATION_ID, 'tech-9', {
      name: 'Redis',
      type: 'INFRASTRUCTURE',
      version: '7',
    });
    expect(mockedAdd).not.toHaveBeenCalled();
  });

  it('falls back to an empty version string when editing a technology with no version', async () => {
    const user = userEvent.setup();
    const technology = makeTechnology({ id: 'tech-10', name: 'Docker', version: null });

    render(<TechnologyManager workspaceId={WORKSPACE_ID} applicationId={APPLICATION_ID} technologies={[technology]} onChanged={vi.fn()} />);

    const rowButtons = within(screen.getByText('Version not specified').closest('.flex.flex-col')!).getAllByRole('button');

    await user.click(rowButtons[0]!);

    expect(screen.getByLabelText('Technology version')).toHaveValue('');
  });
});

describe('TechnologyManager remove flow', () => {
  it('calls removeApplicationTechnology only after the user confirms the window.confirm prompt', async () => {
    const user = userEvent.setup();
    const technology = makeTechnology();
    const onChanged = vi.fn();

    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<TechnologyManager workspaceId={WORKSPACE_ID} applicationId={APPLICATION_ID} technologies={[technology]} onChanged={onChanged} />);

    const rowButtons = within(screen.getByText('Version 16').closest('.flex.flex-col')!).getAllByRole('button');
    const removeButton = rowButtons[1]!;

    await user.click(removeButton);

    expect(window.confirm).toHaveBeenCalledWith('Remove Next.js?');
    expect(mockedRemove).not.toHaveBeenCalled();

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await user.click(removeButton);

    expect(mockedRemove).toHaveBeenCalledWith(WORKSPACE_ID, APPLICATION_ID, technology.id);
    expect(onChanged).toHaveBeenCalledTimes(1);
  });
});

describe('TechnologyManager disabled state', () => {
  it('hides the add form and per-row edit/remove controls when disabled', () => {
    render(<TechnologyManager workspaceId={WORKSPACE_ID} applicationId={APPLICATION_ID} technologies={[makeTechnology()]} disabled onChanged={vi.fn()} />);

    expect(screen.getByText('Restore this application before modifying its technology stack.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Technology name')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});
