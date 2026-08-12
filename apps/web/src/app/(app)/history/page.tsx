'use client';

import { useQuery } from '@tanstack/react-query';
import { CalendarRange, Clock, FileJson, FileSpreadsheet, FilterX, Lock, Search, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import * as api from '@/lib/api';
import type { ActivityRecord, Classification, Tag } from '@/types';
import { useCategories, useTags } from '@/hooks/use-data';
import { PageHeader } from '@/components/common/page-header';
import { StatCard } from '@/components/common/stat-card';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/input';
import { ActivityList } from '@/components/activity/activity-list';
import { EmptyState } from '@/components/ui/misc';
import { CLASSIFICATION_ORDER, CLASSIFICATION_META } from '@/lib/classification';
import { formatDuration, toDateKey } from '@/lib/utils';

const PAGE_DAYS = 7;

interface DraftFilters {
  search: string;
  categoryId: string;
  classification: string;
  tagId: string;
  from: string;
  to: string;
}

const emptyDraft: DraftFilters = {
  search: '',
  categoryId: '',
  classification: '',
  tagId: '',
  from: '',
  to: '',
};

export default function HistoryPage() {
  const { data: categories } = useCategories();
  const { data: tags } = useTags();
  const [draft, setDraft] = useState<DraftFilters>(emptyDraft);
  const [filters, setFilters] = useState<DraftFilters>(emptyDraft);
  const [visibleDays, setVisibleDays] = useState(PAGE_DAYS);

  const recordFilters = useMemo(
    () => ({
      search: filters.search || undefined,
      categoryId: filters.categoryId || undefined,
      classification: (filters.classification || undefined) as Classification | undefined,
      tagId: filters.tagId || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
    }),
    [filters],
  );

  const { data: records, isLoading } = useQuery({
    queryKey: ['history', recordFilters],
    queryFn: () => api.listRecords(recordFilters),
  });

  const grouped = useMemo(() => {
    if (!records) return [];
    const map = new Map<string, ActivityRecord[]>();
    for (const r of records) {
      const key = toDateKey(new Date(r.startTime ?? ''));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [records]);

  const visible = grouped.slice(0, visibleDays);

  const stats = useMemo(() => {
    const list = records ?? [];
    let totalSeconds = 0;
    let productiveSeconds = 0;
    const days = new Set<string>();
    for (const r of list) {
      if (r.durationSeconds) totalSeconds += r.durationSeconds;
      if (r.classification === 'PRODUCTIVE' && r.durationSeconds) productiveSeconds += r.durationSeconds;
      if (r.startTime) days.add(toDateKey(new Date(r.startTime)));
    }
    return {
      total: list.length,
      totalSeconds,
      productiveSeconds,
      days: days.size,
    };
  }, [records]);

  const hasFilters = Object.values(filters).some(Boolean);
  const isDirty = JSON.stringify(draft) !== JSON.stringify(filters);

  const apply = () => {
    setFilters(draft);
    setVisibleDays(PAGE_DAYS);
  };

  const reset = () => {
    setDraft(emptyDraft);
    setFilters(emptyDraft);
    setVisibleDays(PAGE_DAYS);
  };

  const download = async (format: 'csv' | 'json') => {
    const res = await api.exportRecords(format);
    const url = URL.createObjectURL(new Blob([res.content], { type: res.type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = res.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const categoryOf = (id: string) => categories?.find((c) => c.id === id);

  return (
    <div>
      <PageHeader
        title="History"
        description="Your personal activity history — it belongs to you, not the room. Past days are read-only."
        actions={
          <>
            <Button variant="outline" onClick={() => download('csv')}>
              <FileSpreadsheet className="h-4 w-4" /> Export CSV
            </Button>
            <Button variant="outline" onClick={() => download('json')}>
              <FileJson className="h-4 w-4" /> Export JSON
            </Button>
          </>
        }
      />

      <div className="mb-5 rounded-2xl border border-line bg-ink-panel/80 p-4 shadow-card">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
          <Field label="Search" className="lg:col-span-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={draft.search}
                onChange={(e) => setDraft((d) => ({ ...d, search: e.target.value }))}
                placeholder="Title or description…"
                className="pl-9"
              />
            </div>
          </Field>
          <Field label="Category">
            <Select value={draft.categoryId} onChange={(e) => setDraft((d) => ({ ...d, categoryId: e.target.value }))}>
              <option value="">All categories</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Classification">
            <Select
              value={draft.classification}
              onChange={(e) => setDraft((d) => ({ ...d, classification: e.target.value }))}
            >
              <option value="">All</option>
              {CLASSIFICATION_ORDER.map((c) => (
                <option key={c} value={c}>
                  {CLASSIFICATION_META[c].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tag">
            <Select value={draft.tagId} onChange={(e) => setDraft((d) => ({ ...d, tagId: e.target.value }))}>
              <option value="">All tags</option>
              {tags?.map((t: Tag) => (
                <option key={t.id} value={t.id}>
                  #{t.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="From">
            <Input type="date" value={draft.from} onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))} />
          </Field>
          <Field label="To">
            <Input type="date" value={draft.to} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} />
          </Field>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {records?.length ?? 0} {records?.length === 1 ? 'record' : 'records'} across {stats.days} {stats.days === 1 ? 'day' : 'days'}
          </p>
          <div className="flex gap-2">
            {hasFilters ? (
              <Button variant="ghost" size="sm" onClick={reset}>
                <FilterX className="h-3.5 w-3.5" /> Reset
              </Button>
            ) : null}
            <Button size="sm" onClick={apply} disabled={!isDirty}>
              Apply filters
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total records" value={stats.total} icon={<CalendarRange className="h-4 w-4" />} tone="cyan" />
        <StatCard label="Total tracked" value={formatDuration(stats.totalSeconds)} icon={<Clock className="h-4 w-4" />} tone="blue" />
        <StatCard label="Productive time" value={formatDuration(stats.productiveSeconds)} icon={<Zap className="h-4 w-4" />} tone="green" />
        <StatCard label="Days active" value={stats.days} icon={<CalendarRange className="h-4 w-4" />} tone="violet" />
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-line bg-ink-panel/80 p-8 text-center text-sm text-slate-500">
          Loading history…
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Clock className="h-6 w-6" />}
          title="No records match"
          description={hasFilters ? 'Try widening your filters or resetting them.' : 'Track an activity and it will show up here.'}
        />
      ) : (
        <div className="space-y-6">
          {visible.map(([day, dayRecords]) => (
            <div key={day}>
              <div className="mb-2 flex items-baseline justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  {formatDayTitle(day)}
                </p>
                <p className="text-xs text-slate-600">
                  {formatDuration(dayRecords.reduce((acc, r) => acc + (r.durationSeconds ?? 0), 0))} ·{' '}
                  {dayRecords.length} {dayRecords.length === 1 ? 'record' : 'records'}
                </p>
              </div>
              <ActivityList records={dayRecords} categories={categories} tags={tags} />
              <p className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-600">
                <Lock className="h-3 w-3" />
                Read-only — {day === toDateKey(new Date()) ? 'today is editable in Activities' : 'historical records are immutable'}
              </p>
            </div>
          ))}

          {grouped.length > visibleDays ? (
            <div className="flex justify-center pt-1">
              <Button variant="outline" onClick={() => setVisibleDays((n) => n + PAGE_DAYS)}>
                Load more ({grouped.length - visibleDays} more {grouped.length - visibleDays === 1 ? 'day' : 'days'})
              </Button>
            </div>
          ) : null}
        </div>
      )}
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
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
}
