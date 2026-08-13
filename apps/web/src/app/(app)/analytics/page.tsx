'use client';

import { ChevronLeft, ChevronRight, Clock, Flame, Tags, TrendingUp, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { StatCard } from '@/components/common/stat-card';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClassificationStackedBar } from '@/components/charts/classification-stack';
import { WeeklyTrendArea } from '@/components/charts/weekly-trend';
import { CategoryPie } from '@/components/charts/category-pie';
import { ActivityBars } from '@/components/charts/activity-bars';
import {
  useActivityBreakdown,
  useCategoryBreakdown,
  usePartner,
  usePartnerActivityBreakdown,
  usePartnerCategoryBreakdown,
  usePartnerWeekTrend,
  useWeekTrend,
} from '@/hooks/use-data';
import { CLASSIFICATION_META, CLASSIFICATION_ORDER } from '@/lib/classification';
import type { DayBreakdown } from '@/types';
import { cn, formatDuration, toDateKey, weekRange } from '@/lib/utils';

type Scope = 'me' | 'partner';

export default function AnalyticsPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [scope, setScope] = useState<Scope>('me');

  const { data: partner } = usePartner();
  const hasPartner = Boolean(partner);

  const anchor = (() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  })();

  const anchorKey = toDateKey(anchor);
  const week = weekRange(anchorKey);

  const meDays = useWeekTrend(anchorKey);
  const meCategories = useCategoryBreakdown({ from: week.start, to: week.end });
  const meActivities = useActivityBreakdown({ from: week.start, to: week.end });
  const partnerDays = usePartnerWeekTrend(anchorKey);
  const partnerCategories = usePartnerCategoryBreakdown({ from: week.start, to: week.end });
  const partnerActivities = usePartnerActivityBreakdown({ from: week.start, to: week.end });

  const isPartner = scope === 'partner';
  const days = (isPartner ? partnerDays : meDays).data;
  const categories = (isPartner ? partnerCategories : meCategories).data;
  const activities = (isPartner ? partnerActivities : meActivities).data;

  const stats = useMemo(() => {
    const rows = days ?? [];
    let productive = 0;
    let tracked = 0;
    for (const d of rows) {
      productive += d.productiveSeconds;
      tracked += d.productiveSeconds + d.neutralSeconds + d.leisureSeconds + d.unproductiveSeconds;
    }
    const topCategory = [...(categories ?? [])].sort((a, b) => b.seconds - a.seconds)[0];
    const topActivity = [...(activities ?? [])].sort((a, b) => b.seconds - a.seconds)[0];
    const avg = rows.length ? productive / rows.length : 0;
    return { productive, tracked, topCategory, topActivity, avg };
  }, [days, categories, activities]);

  const canGoBack = weekOffset > -4;

  return (
    <div>
      <PageHeader
        title="Analytics"
        description={
          isPartner
            ? `Read-only view of ${partner?.displayName ?? 'your partner'}'s shared activity. Only what they share publicly.`
            : "The truth, plotted. Last week's data is still being collected as 'no activity'."
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-ink-panel/60 px-4 py-2.5">
        <p className="text-sm font-medium text-slate-300">
          Week of <span className="text-slate-100">{week.label}</span>
        </p>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <div className="flex w-full items-center rounded-lg border border-line bg-ink-panel p-1 sm:w-auto">
            <button
              type="button"
              onClick={() => setScope('me')}
              className={cn(
                'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:flex-none',
                !isPartner ? 'bg-ink-elevated text-slate-100 shadow-sm' : 'text-slate-400 hover:text-slate-200',
              )}
            >
              My analytics
            </button>
            <button
              type="button"
              onClick={() => setScope('partner')}
              disabled={!hasPartner}
              title={hasPartner ? 'Switch to partner analytics' : 'Connect with a partner first'}
              className={cn(
                'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:flex-none',
                isPartner ? 'bg-ink-elevated text-slate-100 shadow-sm' : 'text-slate-400 hover:text-slate-200',
                !hasPartner && 'cursor-not-allowed opacity-40 hover:text-slate-400',
              )}
            >
              Partner
            </button>
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon-sm" variant="outline" onClick={() => setWeekOffset((o) => o - 1)} disabled={!canGoBack}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setWeekOffset(0)} disabled={weekOffset === 0}>
              This week
            </Button>
            <Button size="icon-sm" variant="outline" onClick={() => setWeekOffset((o) => Math.min(0, o + 1))} disabled={weekOffset === 0}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {isPartner && !hasPartner ? (
        <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          You&apos;re not connected to a partner right now, so this is showing your own data. Connect in the Room to see your
          partner&apos;s analytics.
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Productive time" value={formatDuration(stats.productive)} tone="green" icon={<Zap className="h-4 w-4" />} />
        <StatCard label="Total tracked" value={formatDuration(stats.tracked)} tone="cyan" icon={<Clock className="h-4 w-4" />} />
        <StatCard
          label="Top category"
          value={stats.topCategory ? `${stats.topCategory.icon ?? ''} ${stats.topCategory.label}` : '—'}
          sub={stats.topCategory ? formatDuration(stats.topCategory.seconds) : undefined}
          tone="blue"
          icon={<Tags className="h-4 w-4" />}
        />
        <StatCard
          label="Top activity"
          value={stats.topActivity?.label ?? '—'}
          sub={stats.topActivity ? formatDuration(stats.topActivity.seconds) : undefined}
          tone="violet"
          icon={<Flame className="h-4 w-4" />}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-5">
        <Card className="min-w-0 p-5 lg:col-span-3">
          <CardTitle>Daily classification</CardTitle>
          <p className="mt-1 text-xs text-slate-500">Stacked hours per day · average {formatDuration(stats.avg)} productive/day</p>
          <div className="mt-3">
            <ClassificationStackedBar data={days ?? []} />
          </div>
        </Card>

        <Card className="min-w-0 p-5 lg:col-span-2">
          <CardTitle>Category mix</CardTitle>
          <p className="mt-1 text-xs text-slate-500">Where {isPartner ? "your partner's" : 'your'} tracked time went</p>
          <CategoryPie data={categories ?? []} />
        </Card>

        <Card className="min-w-0 p-5 lg:col-span-3">
          <CardTitle>Productive trend</CardTitle>
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <TrendingUp className="h-3.5 w-3.5" /> Dashed line = total tracked, filled = productive
          </p>
          <div className="mt-3">
            <WeeklyTrendArea data={days ?? []} />
          </div>
        </Card>

        <Card className="min-w-0 p-5 lg:col-span-2">
          <CardTitle>Activity breakdown</CardTitle>
          <p className="mt-1 text-xs text-slate-500">{isPartner ? 'Shared with you' : 'Ranked by time spent'}</p>
          <div className="mt-4">
            <ActivityBars data={activities ?? []} />
          </div>
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {CLASSIFICATION_ORDER.map((c) => {
          const field = `${c.toLowerCase()}Seconds` as keyof DayBreakdown;
          const seconds = (days ?? []).reduce((acc, d) => acc + (d[field] as number), 0);
          const meta = CLASSIFICATION_META[c];
          return (
            <div key={c} className="rounded-2xl border border-line bg-ink-panel/70 p-4">
              <p className={`text-xs font-medium uppercase tracking-wider ${meta.text}`}>{meta.label}</p>
              <p className="mt-1 text-lg font-semibold text-slate-100">{formatDuration(seconds, { compact: true })}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
