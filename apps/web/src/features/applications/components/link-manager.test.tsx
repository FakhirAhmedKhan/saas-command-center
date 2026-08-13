// @vitest-environment jsdom
import { LinkManager } from './link-manager';
import { addApplicationLink, removeApplicationLink, updateApplicationLink } from '../application-api';
import type { ApplicationLink } from '../application-types';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../application-api', () => ({
  addApplicationLink: vi.fn(),
  updateApplicationLink: vi.fn(),
  removeApplicationLink: vi.fn(),
}));

const mockedAdd = vi.mocked(addApplicationLink);
const mockedUpdate = vi.mocked(updateApplicationLink);
const mockedRemove = vi.mocked(removeApplicationLink);

const WORKSPACE_ID = 'workspace-1';
const APPLICATION_ID = 'application-1';

function makeLink(overrides: Partial<ApplicationLink> = {}): ApplicationLink {
  return {
    id: 'link-1',
    applicationId: APPLICATION_ID,
    label: 'Production',
    type: 'PRODUCTION',
    url: 'https://example.com',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  mockedAdd.mockReset().mockResolvedValue(makeLink());
  mockedUpdate.mockReset().mockResolvedValue(makeLink());
  mockedRemove.mockReset().mockResolvedValue({ message: 'ok' });
  vi.restoreAllMocks();
});

describe('LinkManager add flow', () => {
  it('shows a validation error and does not call the API when label or URL is missing', async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();

    render(<LinkManager workspaceId={WORKSPACE_ID} applicationId={APPLICATION_ID} links={[]} onChanged={onChanged} />);

    await user.click(screen.getByRole('button', { name: /add/i }));

    expect(screen.getByText('Link label and URL are required.')).toBeInTheDocument();
    expect(mockedAdd).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('calls addApplicationLink with trimmed label/url and the selected type, then resets the form', async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();

    render(<LinkManager workspaceId={WORKSPACE_ID} applicationId={APPLICATION_ID} links={[]} onChanged={onChanged} />);

    await user.type(screen.getByLabelText('Link label'), '  Production site  ');
    await user.selectOptions(screen.getByLabelText('Link type'), 'STAGING');
    await user.type(screen.getByLabelText('Link URL'), '  https://staging.example.com  ');
    await user.click(screen.getByRole('button', { name: /add/i }));

    expect(mockedAdd).toHaveBeenCalledWith(WORKSPACE_ID, APPLICATION_ID, {
      label: 'Production site',
      type: 'STAGING',
      url: 'https://staging.example.com',
    });

    expect(await screen.findByLabelText('Link label')).toHaveValue('');
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('shows the API error message when adding a link fails', async () => {
    const user = userEvent.setup();
    mockedAdd.mockRejectedValueOnce(new Error('Link URL already exists'));

    render(<LinkManager workspaceId={WORKSPACE_ID} applicationId={APPLICATION_ID} links={[]} onChanged={vi.fn()} />);

    await user.type(screen.getByLabelText('Link label'), 'Prod');
    await user.type(screen.getByLabelText('Link URL'), 'https://example.com');
    await user.click(screen.getByRole('button', { name: /add/i }));

    expect(await screen.findByText('Link URL already exists')).toBeInTheDocument();
  });
});

describe('LinkManager edit flow', () => {
  it('pre-fills the form from the link being edited and calls updateApplicationLink, not addApplicationLink', async () => {
    const user = userEvent.setup();
    const link = makeLink({ id: 'link-9', label: 'Docs', type: 'DOCUMENTATION', url: 'https://docs.example.com' });

    render(<LinkManager workspaceId={WORKSPACE_ID} applicationId={APPLICATION_ID} links={[link]} onChanged={vi.fn()} />);

    // The link row renders two icon-only buttons: [edit, remove].
    const rowButtons = within(screen.getByText('Docs').closest('.flex.flex-col')!).getAllByRole('button');

    await user.click(rowButtons[0]!);

    expect(screen.getByLabelText('Link label')).toHaveValue('Docs');
    expect(screen.getByLabelText('Link URL')).toHaveValue('https://docs.example.com');

    await user.click(screen.getByRole('button', { name: /update/i }));

    expect(mockedUpdate).toHaveBeenCalledWith(WORKSPACE_ID, APPLICATION_ID, 'link-9', {
      label: 'Docs',
      type: 'DOCUMENTATION',
      url: 'https://docs.example.com',
    });
    expect(mockedAdd).not.toHaveBeenCalled();
  });
});

describe('LinkManager remove flow', () => {
  it('calls removeApplicationLink only after the user confirms the window.confirm prompt', async () => {
    const user = userEvent.setup();
    const link = makeLink();
    const onChanged = vi.fn();

    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<LinkManager workspaceId={WORKSPACE_ID} applicationId={APPLICATION_ID} links={[link]} onChanged={onChanged} />);

    const rowButtons = within(screen.getByRole('link', { name: /example\.com/ }).closest('.flex.flex-col')!).getAllByRole('button');
    const removeButton = rowButtons[1]!;

    await user.click(removeButton);

    expect(window.confirm).toHaveBeenCalledWith('Remove Production?');
    expect(mockedRemove).not.toHaveBeenCalled();

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await user.click(removeButton);

    expect(mockedRemove).toHaveBeenCalledWith(WORKSPACE_ID, APPLICATION_ID, link.id);
    expect(onChanged).toHaveBeenCalledTimes(1);
  });
});

describe('LinkManager disabled state', () => {
  it('hides the add form and per-row edit/remove controls when disabled', () => {
    render(<LinkManager workspaceId={WORKSPACE_ID} applicationId={APPLICATION_ID} links={[makeLink()]} disabled onChanged={vi.fn()} />);

    expect(screen.getByText('Restore this application before modifying its links.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Link label')).not.toBeInTheDocument();
    // No edit/remove icon buttons should render anywhere while disabled.
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});
