'use client';

import type { TimelineBlock } from '@/types';
import { useTimeline } from '@/hooks/use-data';
import { CLASSIFICATION_META } from '@/lib/classification';
import { cn } from '@/lib/utils';

const MAX_HEIGHT = 360;

export function DayTimeline({ dateKey, maxHeight = MAX_HEIGHT }: { dateKey: string; maxHeight?: number }) {
  const { data: blocks, isLoading } = useTimeline(dateKey);

  if (isLoading) {
    return <p className="py-6 text-center text-sm text-slate-500">Loading timeline…</p>;
  }

  if (!blocks?.length) {
    return <p className="py-6 text-center text-sm text-slate-500">No activity recorded for this day.</p>;
  }

  return (
    <div
      className="space-y-1 overflow-y-auto pr-1"
      style={{ maxHeight }}
    >
      {blocks.map((block, i) => (
        <TimelineRow key={i} block={block} isFirst={i === 0} isLast={i === blocks.length - 1} />
      ))}
    </div>
  );
}

function TimelineRow({ block, isFirst, isLast }: { block: TimelineBlock; isFirst: boolean; isLast: boolean }) {
  const isActivity = block.type === 'ACTIVITY';
  return (
    <div className="group relative flex gap-3">
      {/* Rail */}
      <div className="flex w-12 shrink-0 flex-col items-center">
        <div className={cn('h-2 w-2 rounded-full mt-1.5', railDot(block))} />
        {!isLast ? <div className={cn('w-px flex-1 min-h-[16px]', railLine(block))} /> : null}
      </div>

      <div
        className={cn(
          'mb-1 flex min-w-0 flex-1 items-center justify-between gap-3 rounded-xl border px-3 py-2',
          isActivity
            ? 'border-line bg-ink-elevated/60'
            : 'border-slate-500/15 bg-transparent',
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="w-[5.5rem] shrink-0 whitespace-nowrap font-mono text-xs text-slate-400">
            {block.start}–{block.end}
          </span>
          {isActivity ? (
            <>
              <span className="text-base">{block.categoryIcon}</span>
              <span className="truncate text-sm font-medium text-slate-100">{block.title}</span>
              {block.privacy === 'PRIVATE' ? <span className="text-[10px] uppercase tracking-wider text-slate-500">private</span> : null}
            </>
          ) : (
            <span className="truncate text-sm text-slate-500">
              {block.type === 'NO_ACTIVITY' ? 'No activity' : 'No info'}
            </span>
          )}
        </div>
        {isActivity && block.classification ? (
          <span className={cn('text-xs font-medium', CLASSIFICATION_META[block.classification].text)}>
            {CLASSIFICATION_META[block.classification].label}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function railDot(block: TimelineBlock) {
  if (block.type === 'ACTIVITY' && block.classification) {
    return CLASSIFICATION_META[block.classification].dot;
  }
  return block.type === 'NO_INFO' ? 'bg-amber-400' : 'bg-slate-600';
}

function railLine(block: TimelineBlock) {
  if (block.type === 'ACTIVITY' && block.classification) {
    return `opacity-30 ${CLASSIFICATION_META[block.classification].dot}`;
  }
  return 'bg-slate-700/60';
}
