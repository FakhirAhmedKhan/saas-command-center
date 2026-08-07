'use client';

import {
  Suspense,
  type ComponentProps,
} from 'react';

import {
  ProtectedRoute as ProtectedRouteContent,
} from './protected-route-content';

type ProtectedRouteProps =
  ComponentProps<typeof ProtectedRouteContent>;

export function ProtectedRoute(
  props: ProtectedRouteProps,
) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-sm text-slate-500">
            Loading...
          </p>
        </div>
      }
    >
      <ProtectedRouteContent {...props} />
    </Suspense>
  );
}
