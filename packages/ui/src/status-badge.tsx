import type { CSSProperties, ReactNode } from 'react';

export interface StatusBadgeProps {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}

const toneStyles: Record<NonNullable<StatusBadgeProps['tone']>, CSSProperties> = {
  neutral: { background: '#e2e8f0', color: '#334155' },
  success: { background: '#dcfce7', color: '#166534' },
  warning: { background: '#fef3c7', color: '#92400e' },
  danger: { background: '#fee2e2', color: '#991b1b' },
};

export function StatusBadge({ children, tone = 'neutral' }: StatusBadgeProps) {
  return (
    <span
      style={{
        ...toneStyles[tone],
        borderRadius: 999,
        display: 'inline-flex',
        fontSize: 12,
        fontWeight: 700,
        padding: '6px 10px',
      }}
    >
      {children}
    </span>
  );
}
