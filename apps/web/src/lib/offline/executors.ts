import type { Classification, Privacy, User } from '@/types';
import * as api from '@/lib/api';
import type { TimerMode } from '@/types';

type Executor = (payload: unknown) => Promise<unknown>;

export const EXECUTORS: Record<string, Executor> = {
  createCategory: (p) => {
    const { clientId, name, icon, classification } = p as {
      clientId?: string;
      name: string;
      icon: string;
      classification: Classification;
    };
    return api.createCategory({ id: clientId, name, icon, classification });
  },
  updateCategory: (p) => {
    const { id, input } = p as {
      id: string;
      input: Partial<Pick<{ name: string; icon: string; classification: Classification }, 'name' | 'icon' | 'classification'>>;
    };
    return api.updateCategory(id, input);
  },
  deleteCategory: (p) => api.deleteCategory(p as string),
  createTag: (p) => {
    const { name, clientId } = p as { name: string; clientId?: string };
    return api.createTag(name, clientId);
  },
  deleteTag: (p) => api.deleteTag(p as string),
  createTemplate: (p) => {
    const { clientId, categoryId, title, description } = p as {
      clientId?: string;
      categoryId: string;
      title: string;
      description?: string;
    };
    return api.createTemplate({ id: clientId, categoryId, title, description });
  },
  deleteTemplate: (p) => api.deleteTemplate(p as string),
  createManualRecord: (p) => api.createManualRecord(p as api.ManualRecordInput),
  updateRecord: (p) => {
    const { id, input } = p as {
      id: string;
      input: Partial<Pick<{ title: string; description: string; privacy: Privacy; tagIds: string[]; startTime: string; endTime: string }, 'title' | 'description' | 'privacy' | 'tagIds' | 'startTime' | 'endTime'>>;
    };
    return api.updateRecord(id, input);
  },
  deleteRecord: (p) => api.deleteRecord(p as string),
  createSchedule: (p) => api.createSchedule(p as api.CreateScheduleInput),
  deleteSchedule: (p) => api.deleteSchedule(p as string),
  updateProfile: (p) =>
    api.updateProfile(p as Partial<Pick<User, 'displayName' | 'emojiAvatar' | 'timezone'>>),
  updatePreferences: (p) => api.updatePreferences(p as Partial<User['preferences']>),
  markAllNotificationsRead: () => api.markAllNotificationsRead(),
  startTimer: (p) => {
    const { templateId, mode, durationMinutes, startedAt } = p as {
      templateId: string;
      mode: TimerMode;
      durationMinutes?: number;
      startedAt: string;
    };
    return api.startTimerAt({ templateId, mode, durationMinutes }, startedAt);
  },
  stopRecord: (p) => {
    const { id, endedAt } = p as { id: string; endedAt: string };
    return api.stopRecordAt(id, endedAt);
  },
};
