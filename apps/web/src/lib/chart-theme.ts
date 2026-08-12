/** Recharts styles that resolve against the active theme's CSS variables. */

export const chartTooltip = {
  background: 'rgb(var(--ink-panel) / 0.96)',
  border: '1px solid var(--line-strong)',
  borderRadius: 12,
  fontSize: 12,
  boxShadow: 'var(--shadow-glow)',
};

export const chartTooltipLabel = {
  color: 'rgb(var(--slate-100))',
  fontWeight: 600,
};

export const chartTick = { fill: 'rgb(var(--slate-400))', fontSize: 12 };

export const chartTickSmall = { fill: 'rgb(var(--slate-400))', fontSize: 11 };

export const chartAxis = { stroke: 'rgb(var(--slate-400) / 0.25)' };

export const chartGrid = { stroke: 'rgb(var(--slate-400) / 0.14)', vertical: false };

export const chartLegend = { fontSize: 12, color: 'rgb(var(--slate-400))' };

export const chartCursor = { fill: 'rgb(var(--cyan-300) / 0.06)' };

export const chartDashed = 'rgb(var(--slate-400) / 0.9)';
