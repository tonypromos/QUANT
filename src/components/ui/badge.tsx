import * as React from 'react';
import { cn } from '@/lib/utils';

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: 'default' | 'success' | 'danger' | 'warn';
};

export function Badge({ className, tone = 'default', ...props }: BadgeProps) {
  const toneClass =
    tone === 'success'
      ? 'bg-success/20 text-success border-success/35'
      : tone === 'danger'
        ? 'bg-danger/20 text-danger border-danger/35'
        : tone === 'warn'
          ? 'bg-yellow-500/20 text-yellow-300 border-yellow-400/40'
          : 'bg-white/10 text-white/90 border-white/20';

  return (
    <span
      className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide', toneClass, className)}
      {...props}
    />
  );
}
