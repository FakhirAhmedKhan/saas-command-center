import type {
  ReactNode,
} from 'react';

import {
  ProtectedRoute,
} from '@/features/auth/protected-route';

export default function DashboardLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <ProtectedRoute>
      {children}
    </ProtectedRoute>
  );
}