import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { AppProviders } from '@/providers/app-providers';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'SaaS Command Center',
    template: '%s | SaaS Command Center',
  },
  description:
    'Manage SaaS projects, workspaces and progress from one clean dashboard.',
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({
  children,
}: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}