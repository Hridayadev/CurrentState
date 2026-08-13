'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Play, Square } from 'lucide-react';
import Link from 'next/link';
import * as api from '@/lib/api';
import { useActiveRecord, useCategories } from '@/hooks/use-data';
import { Button } from '@/components/ui/button';
import { ClassificationBadge } from '@/components/common/classification-badge';
import { ElapsedTimer, CountdownTimer } from '@/components/activity/live-timer';
import { formatClock } from '@/lib/utils';
import { useAuth } from '@/features/auth/auth-provider';

export function CurrentActivity() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: active } = useActiveRecord();
  const { data: categories } = useCategories();

  const category = categories?.find((c) => c.id === active?.categoryId);

  const stop = useMutation({
    mutationFn: () => api.stopRecord(active!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-record'] });
      queryClient.invalidateQueries({ queryKey: ['records'] });
      queryClient.invalidateQueries({ queryKey: ['breakdown'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
    },
  });

  return (
    <div className="rounded-2xl border border-line bg-ink-panel/80 p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Current activity</p>
        {active ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-emerald-400" />
            Running
          </span>
        ) : null}
      </div>

      {active ? (
        <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-line bg-ink-elevated/70 text-3xl">
            {category?.icon ?? '✨'}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-semibold text-white">{active.title}</h2>
              <ClassificationBadge classification={active.classification} />
            </div>
            <p className="mt-1 text-sm text-slate-400">
              {category?.name} · started at {formatClock(active.startTime!)}
              {active.expectedEndTime ? ` · ends ${formatClock(active.expectedEndTime)}` : ' · stopwatch'}
            </p>
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="text-right">
              <ElapsedTimer startTime={active.startTime!} className="text-2xl font-semibold text-cyan-300 sm:text-3xl" />
              {active.expectedEndTime ? (
                <p className="mt-0.5 text-xs text-slate-500">
                  {active.expectedEndTime ? (
                    <>
                      <CountdownTimer expectedEndTime={active.expectedEndTime} /> left
                    </>
                  ) : null}
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-slate-500">elapsed</p>
              )}
            </div>
            <Button
              variant="danger"
              onClick={() => stop.mutate()}
              loading={stop.isPending}
              disabled={!active || !user}
            >
              <Square className="h-4 w-4 fill-current" /> Stop
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-200">Nothing running</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Start a timer or log an activity to begin tracking your day.
            </p>
          </div>
          <Link href="/activities">
            <Button>
              <Play className="h-4 w-4 fill-current" /> Start an activity <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
