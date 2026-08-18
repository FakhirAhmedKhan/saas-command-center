// @vitest-environment jsdom
import { NotificationBell } from '@/features/team-operations/notification-bell';
import { getUnreadNotificationCount } from '@/features/team-operations/team-operations-api';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/team-operations/team-operations-api', () => ({
  getUnreadNotificationCount: vi.fn(),
}));

const getUnreadNotificationCountMock = vi.mocked(getUnreadNotificationCount);

beforeEach(() => {
  getUnreadNotificationCountMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('NotificationBell', () => {
  it('links to the notifications page', async () => {
    getUnreadNotificationCountMock.mockResolvedValue({ count: 0 });

    await act(async () => {
      render(<NotificationBell />);
    });

    expect(screen.getByRole('link')).toHaveAttribute('href', '/notifications');
  });

  it('does not render a numeric badge when the unread count is zero', async () => {
    getUnreadNotificationCountMock.mockResolvedValue({ count: 0 });

    await act(async () => {
      render(<NotificationBell />);
    });

    expect(screen.getByRole('link')).toHaveAccessibleName('Notifications, 0 unread');
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('renders the exact unread count once loaded', async () => {
    getUnreadNotificationCountMock.mockResolvedValue({ count: 7 });

    await act(async () => {
      render(<NotificationBell />);
    });

    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAccessibleName('Notifications, 7 unread');
  });

  it('caps the visible badge at "99+" once the count exceeds 99, while keeping the true count in the accessible name', async () => {
    getUnreadNotificationCountMock.mockResolvedValue({ count: 142 });

    await act(async () => {
      render(<NotificationBell />);
    });

    expect(screen.getByText('99+')).toBeInTheDocument();
    expect(screen.queryByText('142')).not.toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAccessibleName('Notifications, 142 unread');
  });

  it('shows the exact count at the boundary of 99 without capping', async () => {
    getUnreadNotificationCountMock.mockResolvedValue({ count: 99 });

    await act(async () => {
      render(<NotificationBell />);
    });

    expect(screen.getByText('99')).toBeInTheDocument();
    expect(screen.queryByText('99+')).not.toBeInTheDocument();
  });

  it('falls back to a zero count and shows no badge when the API call fails', async () => {
    getUnreadNotificationCountMock.mockRejectedValue(new Error('network down'));

    await act(async () => {
      render(<NotificationBell />);
    });

    expect(screen.getByRole('link')).toHaveAccessibleName('Notifications, 0 unread');
  });

  it('polls for the unread count again after 30 seconds', async () => {
    vi.useFakeTimers();

    getUnreadNotificationCountMock.mockResolvedValue({ count: 1 });

    await act(async () => {
      render(<NotificationBell />);
    });

    expect(getUnreadNotificationCountMock).toHaveBeenCalledTimes(1);

    getUnreadNotificationCountMock.mockResolvedValue({ count: 2 });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(getUnreadNotificationCountMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('pauses polling while the tab is hidden and refreshes immediately once it becomes visible again', async () => {
    vi.useFakeTimers();

    getUnreadNotificationCountMock.mockResolvedValue({ count: 1 });

    await act(async () => {
      render(<NotificationBell />);
    });

    expect(getUnreadNotificationCountMock).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    getUnreadNotificationCountMock.mockClear();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect(getUnreadNotificationCountMock).not.toHaveBeenCalled();

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });

    getUnreadNotificationCountMock.mockResolvedValue({ count: 3 });

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(getUnreadNotificationCountMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
