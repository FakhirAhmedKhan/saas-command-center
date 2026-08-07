import type {
  Metadata,
} from 'next';

import type {
  ReactNode,
} from 'react';

import {
  Providers,
} from './providers';

import './globals.css';

export const metadata:
  Metadata = {
  title:
    'SaaS Command Center',

  description:
    'Manage applications, analytics, releases, and operational health.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-950 antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}