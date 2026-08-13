import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { registerIdMapping, remapPayload } from '@/lib/offline/flush';
import {
  buildRunningRecord,
  completeActiveRecord,
  setActiveRecordCached,
  buildTemplate,
  buildCategory,
} from '@/lib/offline/optimistic';
import { setQueryClient } from '@/lib/offline/cache';
import type { User } from '@/types';

function makeClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: 0 } } });
}

const sessionUser: User = {
  id: 'u1',
  googleId: 'g1',
  email: 'a@b.c',
  displayName: 'A',
  emojiAvatar: '😀',
  timezone: 'UTC',
  onboarded: true,
  preferences: { overlapEnabled: false, defaultPrivacy: 'PUBLIC', notifications: { activityChanges: true, inApp: true, browserPush: false } },
  createdAt: '2026-01-01T00:00:00Z',
};

describe('remapPayload + registerIdMapping', () => {
  it('resolves cross-op id references after creates', () => {
    const idMap = new Map<string, string>();
    registerIdMapping({ clientId: 'cat-offline' }, { id: 'cat-server' }, idMap);
    registerIdMapping({ clientId: 'tpl-offline' }, { id: 'tpl-server' }, idMap);
    registerIdMapping({ clientId: 'rec-offline' }, { id: 'rec-server' }, idMap);

    const startTimer = remapPayload(
      'startTimer',
      { templateId: 'tpl-offline', mode: 'STOPWATCH', startedAt: '2026-08-13T09:00:00Z', clientId: 'rec-offline' },
      idMap,
    ) as { templateId: string };
    expect(startTimer.templateId).toBe('tpl-server');

    const manual = remapPayload(
      'createManualRecord',
      { templateId: 'tpl-offline', tagIds: ['tag-offline'], start: '09:00', end: '10:00', dateKey: '2026-08-13', privacy: 'PUBLIC', clientId: 'rec-offline' },
      idMap,
    ) as { templateId: string; tagIds: string[] };
    expect(manual.templateId).toBe('tpl-server');
    expect(manual.tagIds).toEqual(['tag-offline']); // tag not mapped yet

    const template = remapPayload(
      'createTemplate',
      { categoryId: 'cat-offline', title: 'Deep work', clientId: 'tpl-offline' },
      idMap,
    ) as { categoryId: string };
    expect(template.categoryId).toBe('cat-server');

    const stop = remapPayload('stopRecord', { id: 'rec-offline', endedAt: '2026-08-13T10:00:00Z' }, idMap) as {
      id: string;
    };
    expect(stop.id).toBe('rec-server');

    expect(remapPayload('deleteRecord', 'rec-offline', idMap)).toBe('rec-server');
    expect(remapPayload('markAllNotificationsRead', null, idMap)).toBeNull();
  });

  it('does not remap ids that were never mapped', () => {
    const idMap = new Map<string, string>();
    expect(remapPayload('startTimer', { templateId: 'real-tpl' }, idMap)).toEqual({ templateId: 'real-tpl' });
  });
});

describe('offline timer optimistic state', () => {
  it('builds a running record and completes it with honest duration', () => {
    const client = makeClient();
    setQueryClient(client);
    client.setQueryData(['session'], sessionUser);
    client.setQueryData(['categories'], [buildCategory({ name: 'Work', icon: '💼', classification: 'PRODUCTIVE' })]);
    const category = client.getQueryData<Array<{ id: string }>>(['categories'])![0];
    const template = buildTemplate({ categoryId: category.id, title: 'Deep work' });
    client.setQueryData(['templates'], [template]);

    const running = buildRunningRecord({ templateId: template.id, mode: 'STOPWATCH' }, '2026-08-13T09:00:00Z');
    expect(running.status).toBe('RUNNING');
    expect(running.source).toBe('TIMER');
    expect(running.userId).toBe('u1');

    setActiveRecordCached(running);
    const completed = completeActiveRecord('2026-08-13T10:30:00Z');
    expect(completed).toBeDefined();
    expect(completed!.status).toBe('COMPLETED');
    expect(completed!.durationSeconds).toBe(5400); // 1.5h
    expect(client.getQueryData(['active-record'])).toBeNull();
  });

  it('throws when templates are not loaded offline', () => {
    const client = makeClient();
    setQueryClient(client);
    client.setQueryData(['session'], sessionUser);
    client.setQueryData(['templates'], []);
    expect(() => buildRunningRecord({ templateId: 'missing', mode: 'STOPWATCH' }, '2026-08-13T09:00:00Z')).toThrow();
  });
});
