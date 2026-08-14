import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

/** Format a number of seconds into a compact duration like "2h 15m" or "45m". */
export function formatDuration(totalSeconds: number, opts: { compact?: boolean; withSeconds?: boolean } = {}): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (opts.withSeconds && h === 0) {
    return `${pad(m)}:${pad(s)}`;
  }
  if (opts.compact) {
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m`;
    return `${s}s`;
  }
  if (h > 0) return `${h}h ${pad(m)}m`;
  return `${m}m`;
}

/** Format elapsed time as a live-stopwatch "HH:MM:SS" / "MM:SS". */
export function formatTimer(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** "09:05" from a Date. */
export function formatClock(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Friendly "Tue, Aug 11" */
export function formatDayLabel(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Local YYYY-MM-DD */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function minutesFromClock(clock: string): number {
  const [h, m] = clock.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function clockFromMinutes(minutes: number): string {
  const total = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

/** Week (Sunday-start) containing the given date. Returns [start, end] date keys. */
export function weekRange(dateKey: string): { start: string; end: string; label: string } {
  const start = parseDateKey(dateKey);
  const day = start.getDay();
  start.setDate(start.getDate() - day);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const label = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  return { start: toDateKey(start), end: toDateKey(end), label };
}

/** Relative time like "12m ago" */
export function timeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/** Turn a room-join error into something a human can act on. */
export function friendlyRoomJoinError(error: unknown): string {
  const message = (error as Error).message ?? '';
  if (message.toLowerCase().includes('2 active members')) {
    return 'This room already has its two members. Rooms hold exactly one partner — leave first if you want a fresh start.';
  }
  if (message.toLowerCase().includes('no connection')) {
    return 'Joining a room needs a connection.';
  }
  return message;
}

export const EMOJI_AVATARS = ['🙂', '🚀', '🐱', '🦊', '🐼', '🧑‍💻', '🌱', '🔥', '⚡', '🎯', '💡', '🍀'];

export const EMOJI_ICONS = [
  '📚', '💻', '🏃', '🎮', '🍽️', '🧹', '🛏️', '📱', '🎵', '🧘',
  '💼', '📝', '🧪', '🎨', '🚗', '🛒', '📞', '✍️', '🏋️', '🚌',
  '🍿', '☕', '🧠', '📊', '🔧', '🌿', '⚽', '🎧', '📷', '🧩',
];
