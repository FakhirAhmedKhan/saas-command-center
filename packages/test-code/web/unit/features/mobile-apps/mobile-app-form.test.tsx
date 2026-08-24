// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MobileAppForm } from '@/features/mobile-apps/mobile-app-form';

describe('MobileAppForm', () => {
  it('creates Android payload', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<MobileAppForm cancelHref='/mobile-apps' submitLabel='Create Mobile App' onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Application name'), 'Karwa Passenger');

    await user.type(screen.getByLabelText('Package ID'), 'com.karwa.app');

    await user.click(
      screen.getByRole('button', {
        name: 'Create Mobile App',
      }),
    );

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Karwa Passenger',
        platform: 'ANDROID',
        framework: 'ANDROID_NATIVE',
        packageId: 'com.karwa.app',
      }),
    );
  });

  it('changes native framework when switching from Android to iOS', async () => {
    const user = userEvent.setup();

    render(<MobileAppForm cancelHref='/mobile-apps' submitLabel='Create Mobile App' onSubmit={vi.fn()} />);

    expect(screen.getByLabelText('Framework')).toHaveValue('ANDROID_NATIVE');

    await user.selectOptions(screen.getByLabelText('Platform'), 'IOS');

    expect(screen.getByLabelText('Framework')).toHaveValue('IOS_NATIVE');
  });

  it('prevents empty application name', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<MobileAppForm cancelHref='/mobile-apps' submitLabel='Create Mobile App' onSubmit={onSubmit} />);

    await user.click(
      screen.getByRole('button', {
        name: 'Create Mobile App',
      }),
    );

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
