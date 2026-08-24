// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProtectedRoute } from '@/features/auth/protected-route';

const { ProtectedRouteContentMock } = vi.hoisted(() => ({
  ProtectedRouteContentMock: vi.fn((props: { children: React.ReactNode }) => <div data-testid='content'>{props.children}</div>),
}));

vi.mock('@/features/auth/protected-route-content', () => ({
  ProtectedRoute: ProtectedRouteContentMock,
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ProtectedRoute (Suspense wrapper)', () => {
  it('forwards children through to the underlying ProtectedRoute content component', () => {
    render(
      <ProtectedRoute>
        <div>wrapped child</div>
      </ProtectedRoute>,
    );

    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.getByText('wrapped child')).toBeInTheDocument();
    expect(ProtectedRouteContentMock).toHaveBeenCalledOnce();
  });
});
