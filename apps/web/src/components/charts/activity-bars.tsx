'use client';

import type { BreakdownSlice } from '@/lib/api';
import { CLASSIFICATION_META } from '@/lib/classification';
import { formatDuration } from '@/lib/utils';

export function ActivityBars({ data }: { data: BreakdownSlice[] }) {
  if (!data.length) {
    return <p className="py-8 text-center text-sm text-slate-500">No tracked time in this period.</p>;
  }
  const max = Math.max(...data.map((d) => d.seconds), 1);

  return (
    <ul className="space-y-3">
      {data.map((slice) => {
        const meta = CLASSIFICATION_META[slice.classification];
        const pct = Math.round((slice.seconds / max) * 100);
        return (
          <li key={slice.key} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-slate-200">
                {slice.icon ?? ''} {slice.label}
              </span>
              <span className="shrink-0 font-mono text-xs text-slate-500">{formatDuration(slice.seconds, { compact: true })}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-ink-elevated">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: meta.hex }}
                title={`${slice.label}: ${formatDuration(slice.seconds)}`}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
