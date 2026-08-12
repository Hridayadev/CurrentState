import type { Classification, TimelineKind } from '@/types';

export interface ClassificationMeta {
  label: string;
  shortLabel: string;
  hex: string;
  text: string;
  bg: string;
  border: string;
  dot: string;
}

export const CLASSIFICATION_META: Record<Classification, ClassificationMeta> = {
  PRODUCTIVE: {
    label: 'Productive',
    shortLabel: 'Prod',
    hex: '#34d399',
    text: 'text-emerald-300',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-400/30',
    dot: 'bg-emerald-400',
  },
  NEUTRAL: {
    label: 'Neutral',
    shortLabel: 'Neu',
    hex: '#60a5fa',
    text: 'text-blue-300',
    bg: 'bg-blue-500/10',
    border: 'border-blue-400/30',
    dot: 'bg-blue-400',
  },
  LEISURE: {
    label: 'Leisure',
    shortLabel: 'Leis',
    hex: '#a78bfa',
    text: 'text-violet-300',
    bg: 'bg-violet-500/10',
    border: 'border-violet-400/30',
    dot: 'bg-violet-400',
  },
  UNPRODUCTIVE: {
    label: 'Unproductive',
    shortLabel: 'Unprod',
    hex: '#fb7185',
    text: 'text-rose-300',
    bg: 'bg-rose-500/10',
    border: 'border-rose-400/30',
    dot: 'bg-rose-400',
  },
};

export const CLASSIFICATION_ORDER: Classification[] = [
  'PRODUCTIVE',
  'NEUTRAL',
  'LEISURE',
  'UNPRODUCTIVE',
];

export const TIMELINE_META: Record<TimelineKind, { label: string; icon: string }> = {
  ACTIVITY: { label: 'Activity', icon: '●' },
  NO_ACTIVITY: { label: 'No activity', icon: '—' },
  NO_INFO: { label: 'No info', icon: '?' },
};
