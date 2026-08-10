import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/features/lib/api/cn';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700 focus-visible:ring-brand-500',

  secondary: 'bg-slate-900 text-white shadow-sm hover:bg-slate-800 focus-visible:ring-slate-500',

  outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-brand-500',

  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-400',

  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-500',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 rounded-md px-2.5 text-[13px]',
  md: 'h-9 rounded-lg px-3.5 text-sm',
  lg: 'h-11 rounded-lg px-5 text-base',
  icon: 'size-9 rounded-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading = false, disabled, children, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold transition',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-opacity-20',
        'disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <>
          <span aria-hidden='true' className='size-4 animate-spin rounded-full border-2 border-current border-r-transparent' />

          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
});
