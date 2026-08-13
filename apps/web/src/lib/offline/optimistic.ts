import type { ActivityRecord, ActivityTemplate, Category, Classification, Privacy, Schedule, Tag, User } from '@/types';
import { OfflineError } from './connectivity';
import { cachedList, cachedUserId, getQueryClient } from './cache';
import { clockFromMinutes, minutesFromClock, parseDateKey } from '@/lib/utils';
import type { ManualRecordInput, CreateScheduleInput } from '@/lib/api';

function now(): string {
  return new Date().toISOString();
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function cachedTemplate(id: string): ActivityTemplate | undefined {
  return cachedList<ActivityTemplate>('templates')?.find((t) => t.id === id);
}

function cachedCategory(id: string): Category | undefined {
  return cachedList<Category>('categories')?.find((c) => c.id === id);
}

function userId(): string {
  return cachedUserId() ?? '';
}

// ---------------------------------------------------------------------------
// Local value builders (mirror the server-side computation in api.ts)
// ---------------------------------------------------------------------------

export function buildCategory(input: { name: string; icon: string; classification: Classification }): Category {
  const timestamp = now();
  return {
    id: newId(),
    userId: userId(),
    name: input.name.trim(),
    icon: input.icon,
    classification: input.classification,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function buildTag(name: string): Tag {
  return {
    id: newId(),
    userId: userId(),
    name: name.trim().replace(/^#/, '').toLowerCase(),
  };
}

export function buildTemplate(input: { categoryId: string; title: string; description?: string }): ActivityTemplate {
  const category = cachedCategory(input.categoryId);
  if (!category) {
    throw new OfflineError('Categories are not loaded yet. Reconnect once to load them, then try again offline.');
  }
  return {
    id: newId(),
    userId: userId(),
    categoryId: input.categoryId,
    title: input.title.trim(),
    description: input.description,
    classification: category.classification,
    createdAt: now(),
  };
}

export function buildRecord(input: ManualRecordInput): ActivityRecord {
  const template = cachedTemplate(input.templateId);
  if (!template) {
    throw new OfflineError('Activities are not loaded yet. Reconnect once to load them, then try again offline.');
  }
  const start = new Date(parseDateKey(input.dateKey));
  start.setHours(Math.floor(minutesFromClock(input.start) / 60), minutesFromClock(input.start) % 60, 0, 0);
  const end = new Date(start);
  if (minutesFromClock(input.end) < minutesFromClock(input.start)) end.setDate(end.getDate() + 1);
  end.setHours(Math.floor(minutesFromClock(input.end) / 60), minutesFromClock(input.end) % 60, 0, 0);
  const timestamp = now();
  return {
    id: newId(),
    userId: userId(),
    categoryId: template.categoryId,
    title: template.title,
    description: input.description,
    classification: template.classification,
    source: 'MANUAL',
    status: 'COMPLETED',
    privacy: input.privacy,
    tagIds: input.tagIds,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    durationSeconds: Math.max(60, Math.round((end.getTime() - start.getTime()) / 1000)),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function buildSchedule(input: CreateScheduleInput): Schedule {
  const plannedEndMinutes = minutesFromClock(input.plannedStart) + input.durationMinutes;
  const timestamp = now();
  return {
    id: newId(),
    userId: userId(),
    templateId: input.templateId,
    scheduledDate: input.scheduledDate,
    plannedStart: input.plannedStart,
    plannedEnd: clockFromMinutes(plannedEndMinutes),
    status: 'PENDING',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function buildUserAfterProfilePatch(
  user: User,
  input: Partial<Pick<User, 'displayName' | 'emojiAvatar' | 'timezone'>>,
): User {
  return { ...user, ...input };
}

export function buildUserAfterPreferencesPatch(user: User, input: Partial<User['preferences']>): User {
  return {
    ...user,
    preferences: {
      ...user.preferences,
      ...(input.overlapEnabled !== undefined || input.defaultPrivacy !== undefined
        ? { overlapEnabled: input.overlapEnabled ?? user.preferences.overlapEnabled, defaultPrivacy: input.defaultPrivacy ?? user.preferences.defaultPrivacy }
        : {}),
      ...(input.notifications ? { notifications: { ...user.preferences.notifications, ...input.notifications } } : {}),
    },
  };
}

// ---------------------------------------------------------------------------
// Cache patches (make queued offline writes visible immediately)
// ---------------------------------------------------------------------------

type ArrayKey = string[];

function patchCaches(
  match: (key: readonly unknown[]) => boolean,
  mutate: (items: unknown[]) => unknown[],
): void {
  const client = getQueryClient();
  for (const query of client.getQueryCache().getAll()) {
    const data = query.state.data;
    if (!Array.isArray(data)) continue;
    if (!match(query.queryKey)) continue;
    client.setQueryData(query.queryKey, mutate(data));
  }
}

const RECORD_KEYS = ['records', 'history'];
const recordKey = (k: readonly unknown[]): boolean =>
  typeof k[0] === 'string' && RECORD_KEYS.includes(k[0] as string);

const byStartTime = (a: ActivityRecord, b: ActivityRecord) => (a.startTime ?? '').localeCompare(b.startTime ?? '');

export function upsertRecord(record: ActivityRecord): void {
  patchCaches(recordKey, (items) => {
    const next = [...items] as ActivityRecord[];
    const idx = next.findIndex((r) => r.id === record.id);
    if (idx >= 0) next[idx] = { ...next[idx], ...record };
    else next.push(record);
    return next.sort(byStartTime);
  });
}

export function removeRecord(id: string): void {
  patchCaches(recordKey, (items) => (items as ActivityRecord[]).filter((r) => r.id !== id));
}

const keyIs = (name: string) => (k: readonly unknown[]): boolean => k[0] === name;

export function upsertInList<T extends { id: string }>(key: string, item: T): void {
  patchCaches(keyIs(key), (items) => {
    const next = [...items] as T[];
    const idx = next.findIndex((x) => x.id === item.id);
    if (idx >= 0) next[idx] = { ...next[idx], ...item };
    else next.push(item);
    return next;
  });
}

export function removeFromList(key: string, id: string): void {
  patchCaches(keyIs(key), (items) => (items as Array<{ id: string }>).filter((x) => x.id !== id));
}

export function markAllNotificationsReadLocally(): void {
  const timestamp = now();
  patchCaches(keyIs('notifications'), (items) =>
    (items as Array<{ readAt?: string }>).map((n) => ({ ...n, readAt: n.readAt ?? timestamp })),
  );
}
