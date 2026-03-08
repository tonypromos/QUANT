import * as React from 'react';
import { cn } from '@/lib/utils';

type SwitchProps = {
  checked: boolean;
  onCheckedChange?: (next: boolean) => void;
  disabled?: boolean;
};

export function Switch({ checked, onCheckedChange, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full border transition',
        checked ? 'border-accent/60 bg-accent/30' : 'border-white/25 bg-white/10',
        disabled && 'cursor-not-allowed opacity-60'
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 rounded-full bg-white shadow transition',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );
}
