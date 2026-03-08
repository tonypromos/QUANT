import * as React from 'react';
import { cn } from '@/lib/utils';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'secondary' | 'danger' | 'ghost';
};

export function Button({ className, variant = 'default', ...props }: ButtonProps) {
  const variantClass =
    variant === 'secondary'
      ? 'bg-white/10 text-ink hover:bg-white/20'
      : variant === 'danger'
        ? 'bg-danger/90 text-white hover:bg-danger'
        : variant === 'ghost'
          ? 'bg-transparent text-ink hover:bg-white/10'
          : 'bg-accent/90 text-black hover:bg-accent';

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50',
        variantClass,
        className
      )}
      {...props}
    />
  );
}
