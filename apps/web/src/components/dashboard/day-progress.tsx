'use client';

import type { DayBreakdown } from '@/types';
import { CLASSIFICATION_META, CLASSIFICATION_ORDER } from '@/lib/classification';
import { formatDuration } from '@/lib/utils';
import { cn } from '@/lib/utils';

const NO_INFO_STYLE = {
  hex: '#64748b',
  text: 'text-slate-400',
  dot: 'bg-slate-500',
};

export function DayProgress({ breakdown, label = 'Today' }: { breakdown: DayBreakdown; label?: string }) {
  const total =
    breakdown.productiveSeconds +
    breakdown.neutralSeconds +
    breakdown.leisureSeconds +
    breakdown.unproductiveSeconds +
    breakdown.noInfoSeconds;

  const segments = [
    ...CLASSIFICATION_ORDER.map((c) => ({
      key: c,
      label: CLASSIFICATION_META[c].label,
      seconds: breakdown[`${c.toLowerCase()}Seconds` as keyof DayBreakdown] as number,
      hex: CLASSIFICATION_META[c].hex,
      text: CLASSIFICATION_META[c].text,
      dot: CLASSIFICATION_META[c].dot,
    })),
    {
      key: 'noInfo',
      label: 'No activity',
      seconds: breakdown.noInfoSeconds,
      hex: NO_INFO_STYLE.hex,
      text: NO_INFO_STYLE.text,
      dot: NO_INFO_STYLE.dot,
    },
  ].filter((s) => s.seconds > 0);

  const pct = (seconds: number) => (total > 0 ? (seconds / total) * 100 : 0);

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label} progress</p>
        <p className="text-xs text-slate-400">
          <span className="font-mono text-slate-200">{formatDuration(total, { compact: true })}</span> tracked
        </p>
      </div>

      {total === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No tracked time yet today.</p>
      ) : (
        <>
          <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-slate-800/60">
            {segments.map((s) => (
              <div
                key={s.key}
                className="h-full transition-all"
                style={{ width: `${pct(s.seconds)}%`, backgroundColor: s.hex }}
                title={`${s.label}: ${formatDuration(s.seconds)}`}
              />
            ))}
          </div>
          <div className="mt-4 space-y-2.5">
            {segments.map((s) => (
              <div key={s.key} className="flex min-w-0 items-center gap-3">
                <span className={cn('h-2 w-2 shrink-0 rounded-sm', s.dot)} />
                <span className="w-24 shrink-0 truncate text-sm capitalize text-slate-400">{s.label}</span>
                <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-800/60">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct(s.seconds)}%`, backgroundColor: s.hex, opacity: 0.85 }}
                  />
                </div>
                <span className={cn('w-14 shrink-0 text-right text-sm font-medium tabular-nums', s.text)}>
                  {formatDuration(s.seconds, { compact: true })}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
