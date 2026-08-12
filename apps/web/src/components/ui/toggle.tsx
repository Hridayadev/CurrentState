'use client';

import { cn } from '@/lib/utils';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function Toggle({ checked, onChange, label, description, disabled, className }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn('group flex w-full items-start gap-3 text-left', disabled && 'opacity-50', className)}
    >
      <span
        className={cn(
          'relative mt-0.5 inline-flex h-5.5 w-10 shrink-0 items-center rounded-full border px-0.5 transition-colors h-[22px] w-[38px]',
          checked ? 'border-cyan-300/60 bg-cyan-400/30' : 'border-slate-500/40 bg-slate-700/50',
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full transition-transform',
            checked ? 'translate-x-[18px] bg-cyan-200' : 'translate-x-0 bg-slate-300',
          )}
        />
      </span>
      {(label || description) && (
        <span className="flex flex-col">
          {label ? <span className="text-sm font-medium text-slate-200">{label}</span> : null}
          {description ? <span className="text-xs text-slate-500">{description}</span> : null}
        </span>
      )}
    </button>
  );
}
