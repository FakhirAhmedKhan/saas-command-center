// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DesktopAppForm } from '@/features/desktop-apps/desktop-app-form';

describe('DesktopAppForm', () => {
  it('submits normalized desktop application data', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<DesktopAppForm cancelHref='/workspaces/workspace-1/desktop-apps' submitLabel='Create Desktop App' onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Application name'), {
      target: {
        value: '  Command Center Desktop  ',
      },
    });

    fireEvent.change(screen.getByLabelText('Platform'), {
      target: {
        value: 'CROSS_PLATFORM',
      },
    });

    fireEvent.change(screen.getByLabelText('Framework'), {
      target: {
        value: 'ELECTRON',
      },
    });

    fireEvent.change(screen.getByLabelText('Architecture'), {
      target: {
        value: 'X64',
      },
    });

    fireEvent.change(screen.getByLabelText('Package name'), {
      target: {
        value: ' com.commandcenter.desktop ',
      },
    });

    fireEvent.change(screen.getByLabelText('Minimum OS version'), {
      target: {
        value: ' Windows 10 ',
      },
    });

    fireEvent.change(screen.getByLabelText('Current version'), {
      target: {
        value: ' 2.4.0 ',
      },
    });

    fireEvent.change(screen.getByLabelText('Current build number'), {
      target: {
        value: ' 184 ',
      },
    });

    fireEvent.change(screen.getByLabelText('Update channel'), {
      target: {
        value: ' stable ',
      },
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Create Desktop App',
      }),
    );

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Command Center Desktop',

        platform: 'CROSS_PLATFORM',

        framework: 'ELECTRON',

        architecture: 'X64',

        packageName: 'com.commandcenter.desktop',

        minimumOsVersion: 'Windows 10',

        currentVersion: '2.4.0',

        currentBuildNumber: '184',

        updateChannel: 'stable',
      });
    });
  });

  it('blocks an empty application name', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<DesktopAppForm cancelHref='/desktop-apps' submitLabel='Create Desktop App' onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Application name'), {
      target: {
        value: ' ',
      },
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Create Desktop App',
      }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Application name must contain at least 2 characters.');

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('changes invalid framework when platform changes', () => {
    render(<DesktopAppForm cancelHref='/desktop-apps' submitLabel='Create Desktop App' onSubmit={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Platform'), {
      target: {
        value: 'WINDOWS',
      },
    });

    fireEvent.change(screen.getByLabelText('Framework'), {
      target: {
        value: 'NATIVE_WINDOWS',
      },
    });

    expect(screen.getByLabelText('Framework')).toHaveValue('NATIVE_WINDOWS');

    fireEvent.change(screen.getByLabelText('Platform'), {
      target: {
        value: 'MACOS',
      },
    });

    expect(screen.getByLabelText('Framework')).not.toHaveValue('NATIVE_WINDOWS');
  });

  it('shows API submission errors', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('API unavailable'));

    render(<DesktopAppForm cancelHref='/desktop-apps' submitLabel='Create Desktop App' onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Application name'), {
      target: {
        value: 'Desktop Failure Test',
      },
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Create Desktop App',
      }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('API unavailable');
  });
});
