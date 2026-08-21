import type { HealthCheckStatus } from './monitoring.types';

interface HealthStatusBadgeProps {
  status: HealthCheckStatus;
}

const STATUS_CLASSES: Record<HealthCheckStatus, string> = {
  HEALTHY: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DEGRADED: 'bg-amber-50 text-amber-700 border-amber-200',
  DOWN: 'bg-red-50 text-red-700 border-red-200',
  UNKNOWN: 'bg-slate-100 text-slate-700 border-slate-200',
  DISABLED: 'bg-slate-100 text-slate-500 border-slate-200',
};

const STATUS_LABELS: Record<HealthCheckStatus, string> = {
  HEALTHY: 'Healthy',
  DEGRADED: 'Degraded',
  DOWN: 'Down',
  UNKNOWN: 'Unknown',
  DISABLED: 'Disabled',
};

export function HealthStatusBadge({ status }: HealthStatusBadgeProps) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_CLASSES[status]}`}>{STATUS_LABELS[status]}</span>;
}
