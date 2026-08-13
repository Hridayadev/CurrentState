import type { Classification, Privacy, User } from '@/types';
import * as api from '@/lib/api';

type Executor = (payload: unknown) => Promise<unknown>;

export const EXECUTORS: Record<string, Executor> = {
  createCategory: (p) =>
    api.createCategory(p as { name: string; icon: string; classification: Classification }),
  updateCategory: (p) => {
    const { id, input } = p as {
      id: string;
      input: Partial<Pick<{ name: string; icon: string; classification: Classification }, 'name' | 'icon' | 'classification'>>;
    };
    return api.updateCategory(id, input);
  },
  deleteCategory: (p) => api.deleteCategory(p as string),
  createTag: (p) => api.createTag(p as string),
  deleteTag: (p) => api.deleteTag(p as string),
  createTemplate: (p) =>
    api.createTemplate(p as { categoryId: string; title: string; description?: string }),
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
};
