'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarRange, Clock, Play, Square } from 'lucide-react';
import { useMemo, useState } from 'react';
import * as api from '@/lib/api';
import type { ActivityRecord } from '@/types';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { QuickStart } from '@/components/activity/quick-start';
import { ManualEntry } from '@/components/activity/manual-entry';
import { ActivityList } from '@/components/activity/activity-list';
import { EditRecordDialog } from '@/components/activity/edit-record';
import { ElapsedTimer } from '@/components/activity/live-timer';
import { ClassificationBadge } from '@/components/common/classification-badge';
import { useActiveRecord, useCategories, useTags } from '@/hooks/use-data';
import { formatClock, toDateKey } from '@/lib/utils';

export default function ActivitiesPage() {
  const queryClient = useQueryClient();
  const { data: active } = useActiveRecord();
  const { data: categories } = useCategories();
  const { data: tags } = useTags();

  const [quickOpen, setQuickOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [range, setRange] = useState<'today' | 'week'>('today');
  const [editing, setEditing] = useState<ActivityRecord | null>(null);
  const [deleting, setDeleting] = useState<ActivityRecord | null>(null);

  const rangeFilter = useMemo(() => {
    const today = toDateKey(new Date());
    if (range === 'today') return { from: today, to: today };
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return { from: toDateKey(d), to: today };
  }, [range]);

  const { data: allRecords } = useQuery({
    queryKey: ['records', rangeFilter],
    queryFn: () => api.listRecords(rangeFilter),
  });

  const activeCategory = categories?.find((c) => c.id === active?.categoryId);

  const stop = useMutation({
    mutationFn: () => api.stopRecord(active!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-record'] });
      queryClient.invalidateQueries({ queryKey: ['records'] });
      queryClient.invalidateQueries({ queryKey: ['breakdown'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      queryClient.invalidateQueries({ queryKey: ['week-trend'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteRecord(deleting!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      queryClient.invalidateQueries({ queryKey: ['active-record'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      queryClient.invalidateQueries({ queryKey: ['breakdown'] });
      setDeleting(null);
    },
  });

  const grouped = useMemo(() => {
    if (!allRecords) return [];
    const map = new Map<string, ActivityRecord[]>();
    for (const r of allRecords) {
      const key = toDateKey(new Date(r.startTime ?? ''));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [allRecords]);

  return (
    <div>
      <PageHeader
        title="Activities"
        description="Start timers, log past activity, and manage today's records."
        actions={
          <>
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setManualOpen(true)}>
              <Clock className="h-4 w-4" /> Log manually
            </Button>
            <Button className="flex-1 sm:flex-none" onClick={() => setQuickOpen(true)}>
              <Play className="h-4 w-4 fill-current" /> Start timer
            </Button>
          </>
        }
      />

      {active ? (
        <div className="mb-6 rounded-2xl border border-emerald-400/25 bg-emerald-400/5 p-5 shadow-card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-ink-elevated/70 text-2xl">
                {activeCategory?.icon ?? '✨'}
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-white">{active.title}</h2>
                  <ClassificationBadge classification={active.classification} />
                </div>
                <p className="mt-0.5 text-sm text-slate-400">
                  {activeCategory?.name} · started {formatClock(active.startTime!)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ElapsedTimer startTime={active.startTime!} className="text-3xl font-semibold text-emerald-300" />
              <Button variant="danger" onClick={() => stop.mutate()} loading={stop.isPending}>
                <Square className="h-4 w-4 fill-current" /> Stop
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mb-5 flex items-center justify-between">
        <Tabs
          value={range}
          onChange={(v) => setRange(v as 'today' | 'week')}
          tabs={[
            { value: 'today', label: 'Today', icon: <CalendarRange className="h-3.5 w-3.5" /> },
            { value: 'week', label: 'This week', icon: <Clock className="h-3.5 w-3.5" /> },
          ]}
        />
        <p className="hidden text-xs text-slate-500 sm:block">
          {range === 'today' ? 'Records for today are editable.' : 'Past days become immutable at midnight.'}
        </p>
      </div>

      {grouped.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">No activities in this range yet.</p>
      ) : (
        <div className="space-y-6">
          {grouped.map(([day, records]) => (
            <div key={day}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
                {formatDayTitle(day)} · {records.length} {records.length === 1 ? 'record' : 'records'}
              </p>
              <ActivityList
                records={records}
                categories={categories}
                tags={tags}
                editable={day === toDateKey(new Date())}
                onEdit={setEditing}
                onDelete={setDeleting}
              />
            </div>
          ))}
        </div>
      )}

      <QuickStart open={quickOpen} onClose={() => setQuickOpen(false)} />
      <ManualEntry open={manualOpen} onClose={() => setManualOpen(false)} />
      <EditRecordDialog record={editing} onClose={() => setEditing(null)} />
      <DeleteConfirm
        record={deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

function formatDayTitle(dateKey: string): string {
  const today = toDateKey(new Date());
  if (dateKey === today) return 'Today';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateKey === toDateKey(yesterday)) return 'Yesterday';
  const d = new Date(dateKey + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function DeleteConfirm({
  record,
  onClose,
  onConfirm,
  loading,
}: {
  record: ActivityRecord | null;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  if (!record) return null;
  const isToday = toDateKey(new Date(record.startTime ?? '')) === toDateKey(new Date());
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/70" onClick={onClose} />
      <div className="relative w-full max-w-sm animate-slide-up rounded-2xl border border-line bg-ink-panel p-5 shadow-glow">
        <h2 className="text-base font-semibold text-white">Delete this record?</h2>
        <p className="mt-1 text-sm text-slate-400">
          {isToday ? (
            <>
              <span className="font-medium text-slate-200">{record.title}</span> will be removed from your history.
            </>
          ) : (
            'Historical records cannot be deleted (BR-042).'
          )}
        </p>
        {isToday ? (
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="danger" onClick={onConfirm} loading={loading}>
              Delete
            </Button>
          </div>
        ) : (
          <div className="mt-4 flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        )}
      </div>
    </div>
  );
}
