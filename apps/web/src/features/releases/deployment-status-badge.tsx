import type { DeploymentStatus } from './release-management.types';

const STATUS_STYLES: Record<DeploymentStatus, string> = {
  DRAFT: 'border-slate-200 bg-slate-100 text-slate-700',

  SCHEDULED: 'border-purple-200 bg-purple-50 text-purple-700',

  IN_PROGRESS: 'border-blue-200 bg-blue-50 text-blue-700',

  SUCCESSFUL: 'border-emerald-200 bg-emerald-50 text-emerald-700',

  FAILED: 'border-red-200 bg-red-50 text-red-700',

  ROLLED_BACK: 'border-amber-200 bg-amber-50 text-amber-700',
};

export function DeploymentStatusBadge({ status }: { status: DeploymentStatus }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}>{status.replace(/_/g, ' ')}</span>;
}
