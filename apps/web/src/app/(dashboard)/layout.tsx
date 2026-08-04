import type { ReactNode } from 'react';

import { AuthenticatedOnly } from '@/components/auth/auth-gates';
import { DashboardShell } from '@/components/layout/dashboard-shell';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <AuthenticatedOnly>
      <DashboardShell>
        {children}
      </DashboardShell>
    </AuthenticatedOnly>
  );
}