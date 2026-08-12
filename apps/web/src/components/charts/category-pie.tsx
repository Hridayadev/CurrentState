'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { BreakdownSlice } from '@/lib/api';
import { CLASSIFICATION_META } from '@/lib/classification';
import { chartTooltip, chartTooltipLabel } from '@/lib/chart-theme';
import { formatDuration } from '@/lib/utils';

export function CategoryPie({ data }: { data: BreakdownSlice[] }) {
  if (!data.length) {
    return <p className="py-10 text-center text-sm text-slate-500">No tracked time in this period.</p>;
  }
  const rows = data.slice(0, 8).map((d) => ({
    name: `${d.icon ?? ''} ${d.label}`,
    value: +(d.seconds / 3600).toFixed(2),
    fill: CLASSIFICATION_META[d.classification].hex,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={rows} dataKey="value" nameKey="name" innerRadius={54} outerRadius={88} paddingAngle={2} strokeWidth={0}>
            {rows.map((row, i) => (
              <Cell key={i} fill={row.fill} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={chartTooltip}
            labelStyle={chartTooltipLabel}
            formatter={(value, name) => [formatDuration((value as number) * 3600, { compact: true }), name]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
