import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import type { Classification } from '@/types';
import { CLASSIFICATION_META } from '@/lib/classification';

type Variant = 'default' | 'outline' | 'soft';
type Tone = 'neutral' | 'cyan' | 'green' | 'amber' | 'rose' | 'violet' | 'slate' | 'classification';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
  tone?: Tone;
  classification?: Classification;
}

const tones: Record<Exclude<Tone, 'classification'>, string> = {
  neutral: 'bg-slate-500/10 text-slate-300 border-slate-500/25',
  cyan: 'bg-cyan-400/10 text-cyan-300 border-cyan-400/30',
  green: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30',
  amber: 'bg-amber-400/10 text-amber-300 border-amber-400/30',
  rose: 'bg-rose-400/10 text-rose-300 border-rose-400/30',
  violet: 'bg-violet-400/10 text-violet-300 border-violet-400/30',
  slate: 'bg-slate-500/10 text-slate-400 border-slate-500/25',
};

export function Badge({
  className,
  variant = 'default',
  tone = 'neutral',
  classification,
  ...props
}: BadgeProps) {
  const toneClass =
    classification !== undefined
      ? `${CLASSIFICATION_META[classification].bg} ${CLASSIFICATION_META[classification].text} ${CLASSIFICATION_META[classification].border}`
      : tones[tone as Exclude<Tone, 'classification'>];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border',
        variant === 'outline' ? 'bg-transparent' : toneClass,
        variant === 'outline' && classification === undefined && 'border-slate-500/40 text-slate-300',
        className,
      )}
      {...props}
    />
  );
}
