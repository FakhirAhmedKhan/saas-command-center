import type { ReactNode } from 'react';

import { AppShell } from '@/components/layout/app-shell';
import { ProtectedRoute } from '@/features/auth/protected-route';

export default function DashboardLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <ProtectedRoute>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}
