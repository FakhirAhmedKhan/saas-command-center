import type { ReactNode } from 'react';

import { GuestOnly } from '@/features/auth/auth-gates';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <GuestOnly>
      <main className="auth-page">
        <section className="auth-brand">
          <div className="brand-mark">SC</div>

          <div>
            <p className="eyebrow">SaaS Command Center</p>

            <h1>Know what needs your attention.</h1>

            <p className="auth-brand-copy">Keep projects, teams and workspace activity organized in one clear command center.</p>
          </div>
        </section>

        <section className="auth-content">{children}</section>
      </main>
    </GuestOnly>
  );
}
