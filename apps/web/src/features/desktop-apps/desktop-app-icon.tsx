import { Monitor } from 'lucide-react';

export interface DesktopAppIconProps {
  className?: string;
}

export function DesktopAppIcon({ className = 'size-4' }: DesktopAppIconProps) {
  return <Monitor aria-hidden='true' className={className} />;
}
