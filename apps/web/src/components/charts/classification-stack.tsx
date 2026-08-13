'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DayBreakdown } from '@/types';
import { CLASSIFICATION_META, CLASSIFICATION_ORDER } from '@/lib/classification';
import { chartAxis, chartCursor, chartGrid, chartLegend, chartTick, chartTickSmall, chartTooltip, chartTooltipLabel } from '@/lib/chart-theme';
import { formatDuration } from '@/lib/utils';

interface Row {
  label: string;
  [key: string]: string | number;
}

export function ClassificationStackedBar({ data }: { data: DayBreakdown[] }) {
  const rows: Row[] = data.map((d) => {
    const label = new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
    return {
      label,
      Productive: +(d.productiveSeconds / 3600).toFixed(2),
      Neutral: +(d.neutralSeconds / 3600).toFixed(2),
      Leisure: +(d.leisureSeconds / 3600).toFixed(2),
      Unproductive: +(d.unproductiveSeconds / 3600).toFixed(2),
    };
  });

  const bars = [
    { key: 'Productive', meta: CLASSIFICATION_META.PRODUCTIVE },
    { key: 'Neutral', meta: CLASSIFICATION_META.NEUTRAL },
    { key: 'Leisure', meta: CLASSIFICATION_META.LEISURE },
    { key: 'Unproductive', meta: CLASSIFICATION_META.UNPRODUCTIVE },
  ];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" {...chartGrid} />
          <XAxis dataKey="label" tick={chartTick} axisLine={chartAxis} tickLine={false} />
          <YAxis tick={chartTickSmall} axisLine={false} tickLine={false} unit="h" />
          <Tooltip
            cursor={chartCursor}
            contentStyle={chartTooltip}
            labelStyle={chartTooltipLabel}
            formatter={(value) => [formatDuration((value as number) * 3600, { compact: true }), '']}
          />
          <Legend wrapperStyle={chartLegend} />
          {bars.map((b) => (
            <Bar key={b.key} dataKey={b.key} stackId="a" fill={b.meta.hex} radius={[0, 0, 0, 0]} maxBarSize={36} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
