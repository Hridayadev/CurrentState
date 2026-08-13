'use client';

import { BarChart3, Clock3, Hourglass, Timer } from 'lucide-react';
import { useMemo } from 'react';
import { toDateKey } from '@/lib/utils';
import { useDayBreakdown, useWeekTrend } from '@/hooks/use-data';
import { CurrentActivity } from '@/components/dashboard/current-activity';
import { DayProgress } from '@/components/dashboard/day-progress';
import { PartnerCard } from '@/components/dashboard/partner-card';
import { DayTimeline } from '@/components/dashboard/day-timeline';
import { StatCard } from '@/components/common/stat-card';
import { PageHeader } from '@/components/common/page-header';
import { formatDuration } from '@/lib/utils';
import { CLASSIFICATION_META } from '@/lib/classification';

export default function DashboardPage() {
  const todayKey = toDateKey(new Date());
  const { data: today, isLoading: todayLoading } = useDayBreakdown(todayKey);
  const { data: week } = useWeekTrend(todayKey);

  const weekTotals = useMemo(() => {
    const acc = { PRODUCTIVE: 0, NEUTRAL: 0, LEISURE: 0, UNPRODUCTIVE: 0 } as Record<string, number>;
    week?.forEach((d) => {
      acc.PRODUCTIVE += d.productiveSeconds;
      acc.NEUTRAL += d.neutralSeconds;
      acc.LEISURE += d.leisureSeconds;
      acc.UNPRODUCTIVE += d.unproductiveSeconds;
    });
    return acc;
  }, [week]);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Your current state, today's balance, and what your partner is up to."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="This week · Productive"
          value={formatDuration(weekTotals.PRODUCTIVE)}
          icon={<BarChart3 className="h-4 w-4" />}
          tone="green"
        />
        <StatCard
          label="This week · Neutral"
          value={formatDuration(weekTotals.NEUTRAL)}
          icon={<Clock3 className="h-4 w-4" />}
          tone="blue"
        />
        <StatCard
          label="This week · Leisure"
          value={formatDuration(weekTotals.LEISURE)}
          icon={<Hourglass className="h-4 w-4" />}
          tone="violet"
        />
        <StatCard
          label="This week · Unproductive"
          value={formatDuration(weekTotals.UNPRODUCTIVE)}
          icon={<Timer className="h-4 w-4" />}
          tone="rose"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="min-w-0 space-y-5 lg:col-span-2">
          <CurrentActivity />
          {todayLoading || !today ? (
            <div className="rounded-2xl border border-line bg-ink-panel/80 p-5 shadow-card">
              <p className="text-sm text-slate-500">Loading today&apos;s progress…</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-line bg-ink-panel/80 p-5 shadow-card">
              <DayProgress breakdown={today} />
            </div>
          )}
          <div className="rounded-2xl border border-line bg-ink-panel/80 p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Today&apos;s timeline</p>
              <span className="text-xs text-slate-500">Updates as you track</span>
            </div>
            <DayTimeline dateKey={todayKey} />
          </div>
        </div>

        <div className="min-w-0 space-y-5">
          <PartnerCard />
          <WeekLegend weekTotals={weekTotals} />
        </div>
      </div>
    </div>
  );
}

function WeekLegend({ weekTotals }: { weekTotals: Record<string, number> }) {
  const entries = [
    { key: 'PRODUCTIVE', label: 'Productive', color: CLASSIFICATION_META.PRODUCTIVE.hex },
    { key: 'NEUTRAL', label: 'Neutral', color: CLASSIFICATION_META.NEUTRAL.hex },
    { key: 'LEISURE', label: 'Leisure', color: CLASSIFICATION_META.LEISURE.hex },
    { key: 'UNPRODUCTIVE', label: 'Unproductive', color: CLASSIFICATION_META.UNPRODUCTIVE.hex },
  ];
  const total = entries.reduce((sum, e) => sum + (weekTotals[e.key] ?? 0), 0);

  return (
    <div className="rounded-2xl border border-line bg-ink-panel/80 p-5 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Week balance</p>
      <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-slate-800/60">
        {total > 0
          ? entries
              .filter((e) => weekTotals[e.key] > 0)
              .map((e) => (
                <div
                  key={e.key}
                  style={{ width: `${((weekTotals[e.key] ?? 0) / total) * 100}%`, backgroundColor: e.color }}
                />
              ))
          : null}
      </div>
      <div className="mt-4 space-y-2">
        {entries.map((e) => (
          <div key={e.key} className="flex min-w-0 items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-slate-400">
              <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: e.color }} />
              <span className="truncate">{e.label}</span>
            </span>
            <span className="shrink-0 font-medium text-slate-200">{formatDuration(weekTotals[e.key] ?? 0, { compact: true })}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
