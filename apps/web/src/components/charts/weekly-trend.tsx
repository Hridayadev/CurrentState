'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DayBreakdown } from '@/types';
import { CLASSIFICATION_META } from '@/lib/classification';
import { chartAxis, chartDashed, chartGrid, chartTick, chartTickSmall, chartTooltip, chartTooltipLabel } from '@/lib/chart-theme';
import { formatDuration } from '@/lib/utils';

export function WeeklyTrendArea({ data }: { data: DayBreakdown[] }) {
  const rows = data.map((d) => ({
    label: new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
    productive: +(d.productiveSeconds / 3600).toFixed(2),
    total: +((d.productiveSeconds + d.neutralSeconds + d.leisureSeconds + d.unproductiveSeconds) / 3600).toFixed(2),
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="productiveFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CLASSIFICATION_META.PRODUCTIVE.hex} stopOpacity={0.4} />
              <stop offset="100%" stopColor={CLASSIFICATION_META.PRODUCTIVE.hex} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" {...chartGrid} />
          <XAxis dataKey="label" tick={chartTick} axisLine={chartAxis} tickLine={false} />
          <YAxis tick={chartTickSmall} axisLine={false} tickLine={false} unit="h" />
          <Tooltip
            contentStyle={chartTooltip}
            labelStyle={chartTooltipLabel}
            formatter={(value, name) => [
              formatDuration((value as number) * 3600, { compact: true }),
              name === 'productive' ? 'Productive' : 'Tracked',
            ]}
          />
          <Area type="monotone" dataKey="total" stroke={chartDashed} strokeWidth={1.5} strokeDasharray="4 4" fill="none" name="total" />
          <Area type="monotone" dataKey="productive" stroke={CLASSIFICATION_META.PRODUCTIVE.hex} strokeWidth={2.5} fill="url(#productiveFill)" name="productive" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
