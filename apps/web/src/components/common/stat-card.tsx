import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  sub,
  icon,
  tone = 'default',
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  tone?: 'default' | 'green' | 'blue' | 'violet' | 'rose' | 'cyan' | 'slate';
  className?: string;
}) {
  const iconTones = {
    default: 'bg-overlay text-slate-300',
    green: 'bg-emerald-500/10 text-emerald-300',
    blue: 'bg-blue-500/10 text-blue-300',
    violet: 'bg-violet-500/10 text-violet-300',
    rose: 'bg-rose-500/10 text-rose-300',
    cyan: 'bg-cyan-500/10 text-cyan-300',
    slate: 'bg-slate-500/10 text-slate-400',
  } as const;

  return (
    <div
      className={cn(
        'rounded-2xl border border-line bg-ink-panel/80 p-4 shadow-card',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
        {icon ? <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', iconTones[tone])}>{icon}</span> : null}
      </div>
      <p className="mt-2 break-words text-xl font-semibold tracking-tight text-white sm:text-2xl">{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}
