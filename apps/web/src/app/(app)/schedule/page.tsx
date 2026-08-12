'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Clock, Play, Plus } from 'lucide-react';
import { useState } from 'react';
import * as api from '@/lib/api';
import type { Schedule } from '@/types';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input } from '@/components/ui/input';
import { TemplatePicker } from '@/components/activity/template-picker';
import { useActiveRecord, useCategories, useSchedules, useTemplates } from '@/hooks/use-data';
import { useAuth } from '@/features/auth/auth-provider';
import { cn, minutesFromClock, parseDateKey, toDateKey } from '@/lib/utils';

export default function SchedulePage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const todayKey = toDateKey(new Date());
  const { data: todaySchedules } = useSchedules(todayKey);
  const { data: active } = useActiveRecord();

  const [createOpen, setCreateOpen] = useState(false);

  const startSchedule = useMutation({
    mutationFn: (id: string) => api.startSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['active-record'] });
      queryClient.invalidateQueries({ queryKey: ['records'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      queryClient.invalidateQueries({ queryKey: ['breakdown'] });
      queryClient.invalidateQueries({ queryKey: ['week-trend'] });
    },
  });

  const overlapEnabled = user?.preferences.overlapEnabled ?? false;
  const canStart = (schedule: Schedule) => {
    if (schedule.status !== 'PENDING') return false;
    if (active && !overlapEnabled) return false;
    return true;
  };

  return (
    <div>
      <PageHeader
        title="Schedule"
        description="Plans, not promises — scheduled activities never start on their own."
        actions={
          <Button className="flex-1 sm:flex-none" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New schedule
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionTitle>Today</SectionTitle>
          {!todaySchedules?.length ? (
            <p className="rounded-xl border border-dashed border-slate-500/30 px-4 py-8 text-center text-sm text-slate-500">
              No schedules for today. Plan something and start it when you&apos;re ready.
            </p>
          ) : (
            <div className="space-y-2">
              {todaySchedules.map((schedule) => (
                <ScheduleRow
                  key={schedule.id}
                  schedule={schedule}
                  onStart={() => startSchedule.mutate(schedule.id)}
                  startDisabled={!canStart(schedule)}
                  overlapDisabled={Boolean(active) && !overlapEnabled}
                  isPast={
                    minutesFromClock(schedule.plannedStart) * 60_000 +
                      new Date(parseDateKey(todayKey)).getTime() <
                    Date.now()
                  }
                />
              ))}
            </div>
          )}

          <div className="mt-8">
            <SectionTitle>Upcoming</SectionTitle>
            <UpcomingList onStart={(id) => startSchedule.mutate(id)} overlapDisabled={Boolean(active) && !overlapEnabled} />
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-line bg-ink-panel/80 p-5 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">How schedules work</p>
            <ul className="mt-3 space-y-2.5 text-sm text-slate-400">
              <li className="flex gap-2">
                <span className="text-cyan-300">•</span> A schedule is an intention, not proof the activity happened.
              </li>
              <li className="flex gap-2">
                <span className="text-cyan-300">•</span> You must click <span className="font-medium text-slate-200">Start</span> — nothing auto-starts.
              </li>
              <li className="flex gap-2">
                <span className="text-cyan-300">•</span> Unanswered schedules become <span className="font-medium text-amber-300">No info</span> at day end — never “unproductive”.
              </li>
              <li className="flex gap-2">
                <span className="text-cyan-300">•</span> A schedule can&apos;t start while a non-overlapping activity is running.
              </li>
            </ul>
          </div>
          <TodayMiniTimeline />
        </aside>
      </div>

      <CreateScheduleDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">{children}</h2>;
}

function ScheduleRow({
  schedule,
  onStart,
  startDisabled,
  overlapDisabled,
  isPast,
}: {
  schedule: Schedule;
  onStart: () => void;
  startDisabled: boolean;
  overlapDisabled: boolean;
  isPast: boolean;
}) {
  const { data: templates } = useTemplates();
  const { data: categories } = useCategories();
  const template = templates?.find((t) => t.id === schedule.templateId);
  const category = categories?.find((c) => c.id === template?.categoryId);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-ink-panel/70 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-ink-elevated/60 text-xl">
          {category?.icon ?? '🗓️'}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium text-slate-100">{template?.title ?? 'Unknown activity'}</p>
            <ScheduleStatusBadge status={schedule.status} />
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            <Clock className="mr-1 inline h-3 w-3" />
            {schedule.plannedStart}–{schedule.plannedEnd ?? '?'} · {category?.name}
            {isPast && schedule.status === 'PENDING' ? ' · time passed, still awaiting you' : ''}
          </p>
        </div>
      </div>
      {schedule.status === 'PENDING' ? (
        <Button
          size="sm"
          onClick={onStart}
          disabled={startDisabled}
          title={overlapDisabled ? 'Stop your current activity first' : undefined}
        >
          <Play className="h-3.5 w-3.5 fill-current" /> Start
        </Button>
      ) : (
        <Badge tone={schedule.status === 'STARTED' ? 'green' : 'slate'}>
          {schedule.status === 'STARTED' ? 'In progress' : 'No response'}
        </Badge>
      )}
    </div>
  );
}

function ScheduleStatusBadge({ status }: { status: Schedule['status'] }) {
  if (status === 'PENDING') return <Badge tone="amber">Pending</Badge>;
  if (status === 'STARTED') return <Badge tone="green">Started</Badge>;
  if (status === 'NO_INFO') return <Badge tone="slate">No info</Badge>;
  return <Badge tone="cyan">Scheduled</Badge>;
}

function UpcomingList({
  onStart,
  overlapDisabled,
}: {
  onStart: (id: string) => void;
  overlapDisabled: boolean;
}) {
  const { data: schedules } = useSchedules();
  const { data: templates } = useTemplates();
  const { data: categories } = useCategories();
  const todayKey = toDateKey(new Date());

  const upcoming = schedules?.filter((s) => s.scheduledDate > todayKey).sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)) ?? [];

  if (!upcoming.length) {
    return <p className="text-sm text-slate-500">Nothing planned after today.</p>;
  }

  return (
    <div className="space-y-2">
      {upcoming.map((schedule) => {
        const template = templates?.find((t) => t.id === schedule.templateId);
        const category = categories?.find((c) => c.id === template?.categoryId);
        const d = parseDateKey(schedule.scheduledDate);
        const dateLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        return (
          <div key={schedule.id} className="flex items-center justify-between rounded-xl border border-line bg-ink-panel/60 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="text-lg">{category?.icon ?? '🗓️'}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-100">{template?.title ?? 'Unknown'}</p>
                <p className="text-xs text-slate-500">
                  {dateLabel} · {schedule.plannedStart}
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" disabled={overlapDisabled} onClick={() => onStart(schedule.id)}>
              <Play className="h-3.5 w-3.5 fill-current" /> Start
            </Button>
          </div>
        );
      })}
    </div>
  );
}

function TodayMiniTimeline() {
  const { data: todaySchedules } = useSchedules(toDateKey(new Date()));
  const { data: templates } = useTemplates();
  if (!todaySchedules?.length) return null;
  return (
    <div className="rounded-2xl border border-line bg-ink-panel/80 p-5 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Today&apos;s plan</p>
      <div className="mt-3 space-y-2">
        {todaySchedules.map((s) => {
          const template = templates?.find((t) => t.id === s.templateId);
          return (
            <div key={s.id} className="flex items-center gap-2.5 text-sm">
              <span className="w-10 font-mono text-xs text-slate-500">{s.plannedStart}</span>
              <span
                className={cn(
                  'h-1.5 w-1.5 shrink-0 rounded-full',
                  s.status === 'STARTED' ? 'bg-emerald-400' : s.status === 'NO_INFO' ? 'bg-amber-400' : 'bg-slate-600',
                )}
              />
              <span className={cn('truncate', s.status === 'STARTED' ? 'text-emerald-300' : 'text-slate-300')}>
                {template?.title ?? 'Unknown'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CreateScheduleDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const todayKey = toDateKey(new Date());

  const [templateId, setTemplateId] = useState('');
  const [dateKey, setDateKey] = useState(todayKey);
  const [startTime, setStartTime] = useState('18:00');
  const [minutes, setMinutes] = useState(60);

  const create = useMutation({
    mutationFn: () =>
      api.createSchedule({ templateId, scheduledDate: dateKey, plannedStart: startTime, durationMinutes: minutes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      onClose();
      setTemplateId('');
    },
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Create a schedule"
      description="It stays pending until you explicitly start it on the day."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => create.mutate()} disabled={!templateId} loading={create.isPending}>
            <CalendarDays className="h-4 w-4" /> Schedule
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Activity">
          <TemplatePicker value={templateId} onChange={setTemplateId} maxHeight="max-h-48" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <Input type="date" value={dateKey} min={todayKey} onChange={(e) => setDateKey(e.target.value)} />
          </Field>
          <Field label="Start time">
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </Field>
        </div>
        <Field label="Duration (minutes)">
          <Input type="number" min={5} max={720} step={5} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
        </Field>
      </div>
    </Dialog>
  );
}
