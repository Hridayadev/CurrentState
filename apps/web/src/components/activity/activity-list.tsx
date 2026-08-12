'use client';

import { Lock, Pencil, Trash2 } from 'lucide-react';
import type { ActivityRecord, Category } from '@/types';
import { ClassificationBadge } from '@/components/common/classification-badge';
import { Button } from '@/components/ui/button';
import { formatClock, formatDuration, timeAgo } from '@/lib/utils';

export interface CategoryMap {
  [categoryId: string]: Category;
}

export function ActivityList({
  records,
  categories,
  tags,
  editable,
  onEdit,
  onDelete,
}: {
  records: ActivityRecord[];
  categories?: Category[];
  tags?: { id: string; name: string }[];
  editable?: boolean;
  onEdit?: (record: ActivityRecord) => void;
  onDelete?: (record: ActivityRecord) => void;
}) {
  if (!records.length) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">No activities recorded here yet.</p>
    );
  }

  const categoryOf = (id: string) => categories?.find((c) => c.id === id);

  return (
    <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-ink-panel/70">
      {records.map((record) => {
        const category = categoryOf(record.categoryId);
        const recordTags = record.tagIds
          .map((id) => tags?.find((t) => t.id === id))
          .filter(Boolean) as { id: string; name: string }[];

        return (
          <div key={record.id} className="flex flex-col gap-2 p-4 transition-colors hover:bg-overlay sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="w-24 shrink-0 text-right font-mono text-xs text-slate-500">
                {record.startTime ? formatClock(record.startTime) : '--:--'}
                <span className="block text-slate-600">
                  {record.endTime ? formatClock(record.endTime) : 'running'}
                </span>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-ink-elevated/60 text-lg">
                {category?.icon ?? '✨'}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium text-slate-100">{record.title}</p>
                  <ClassificationBadge classification={record.classification} className="hidden sm:inline-flex" />
                  {record.privacy === 'PRIVATE' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-400">
                      <Lock className="h-2.5 w-2.5" /> private
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {category?.name}
                  {record.description ? ` · ${record.description}` : ''}
                </p>
                {recordTags.length ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {recordTags.map((t) => (
                      <span key={t.id} className="text-[11px] text-cyan-300/80">
                        #{t.name}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
              <span className="text-sm font-medium tabular-nums text-slate-200">
                {record.status === 'RUNNING' ? (
                  <span className="text-emerald-300">running</span>
                ) : (
                  formatDuration(record.durationSeconds ?? 0, { compact: true })
                )}
              </span>
              <span className="hidden text-xs text-slate-600 md:block">{timeAgo(record.startTime ?? '')}</span>
              {editable ? (
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon-sm" onClick={() => onEdit?.(record)} aria-label="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" className="text-rose-300 hover:bg-rose-500/10" onClick={() => onDelete?.(record)} aria-label="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
