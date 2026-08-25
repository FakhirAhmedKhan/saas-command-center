// app/DynmicIndex.tsx

import { FullPageLoader } from '@/features/auth/auth-gates';
import { Activity, Building2, Boxes, Globe2, Smartphone, Monitor, Radio, GitBranch, Settings } from 'lucide-react';
import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

export const LandingPage = dynamic(() => import('@/features/landingpage'), {
  loading: () => <FullPageLoader />,
});

interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  isActive: (pathname: string, workspaceId: string) => boolean;
}
interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Workspace',
    items: [
      { label: 'Overview', href: '', icon: Building2, isActive: (pathname, workspaceId) => pathname === `/workspaces/${workspaceId}` },
      { label: 'Applications', href: '/applications', icon: Boxes, isActive: (pathname, workspaceId) => pathname.startsWith(`/workspaces/${workspaceId}/applications`) },
      { label: 'Websites', href: '/websites', icon: Globe2, isActive: (pathname, workspaceId) => pathname.startsWith(`/workspaces/${workspaceId}/websites`) },
      { label: 'Mobile Apps', href: '/mobile-apps', icon: Smartphone, isActive: (pathname, workspaceId) => pathname.startsWith(`/workspaces/${workspaceId}/mobile-apps`) },
      { label: 'Desktop Apps', href: '/desktop-apps', icon: Monitor, isActive: (pathname, workspaceId) => pathname.startsWith(`/workspaces/${workspaceId}/desktop-apps`) },
      { label: 'Activity', href: '/activity', icon: Activity, isActive: (pathname, workspaceId) => pathname.startsWith(`/workspaces/${workspaceId}/activity`) },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Monitoring', href: '/monitoring', icon: Radio, isActive: (pathname, workspaceId) => pathname.startsWith(`/workspaces/${workspaceId}/monitoring`) },
      { label: 'Repositories', href: '/repositories', icon: GitBranch, isActive: (pathname, workspaceId) => pathname.startsWith(`/workspaces/${workspaceId}/repositories`) },
    ],
  },
  {
    label: 'Configuration',
    items: [{ label: 'Settings', href: '/settings', icon: Settings, isActive: (pathname, workspaceId) => pathname.startsWith(`/workspaces/${workspaceId}/settings`) }],
  },
];
