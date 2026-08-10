import { AppShell } from '@/components/layout/app-shell';
import { ProtectedRoute } from '@/features/auth/protected-route';
import type { ReactNode } from 'react';

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
