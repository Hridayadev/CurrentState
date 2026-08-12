export type Classification = 'PRODUCTIVE' | 'NEUTRAL' | 'LEISURE' | 'UNPRODUCTIVE';
export type ActivityStatus = 'PENDING' | 'RUNNING' | 'COMPLETED';
export type ScheduleStatus = 'SCHEDULED' | 'PENDING' | 'STARTED' | 'NO_INFO';
export type Privacy = 'PUBLIC' | 'PRIVATE';
export type ActivitySource = 'MANUAL' | 'TIMER' | 'SCHEDULE';
export type TimerMode = 'STOPWATCH' | 'FIXED_DURATION';
export type TimelineKind = 'ACTIVITY' | 'NO_ACTIVITY' | 'NO_INFO';

export interface NotificationPreferences {
  activityChanges: boolean;
  inApp: boolean;
  browserPush: boolean;
}

export interface Preferences {
  overlapEnabled: boolean;
  defaultPrivacy: Privacy;
  notifications: NotificationPreferences;
}

export interface User {
  id: string;
  googleId: string;
  email: string;
  displayName: string;
  emojiAvatar: string;
  timezone: string;
  onboarded: boolean;
  preferences: Preferences;
  createdAt: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  icon: string;
  classification: Classification;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  userId: string;
  name: string;
}

/** A reusable activity definition (e.g. "Mathematics" under "Study"). */
export interface ActivityTemplate {
  id: string;
  userId: string;
  categoryId: string;
  title: string;
  description?: string;
  classification: Classification;
  createdAt: string;
}

/** A tracked instance with a real time interval (e.g. Mathematics 09:00–11:00). */
export interface ActivityRecord {
  id: string;
  userId: string;
  categoryId: string;
  title: string;
  description?: string;
  classification: Classification;
  source: ActivitySource;
  status: ActivityStatus;
  privacy: Privacy;
  tagIds: string[];
  startTime?: string;
  endTime?: string;
  expectedEndTime?: string;
  durationSeconds?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Schedule {
  id: string;
  userId: string;
  templateId: string;
  scheduledDate: string; // YYYY-MM-DD in user's timezone
  plannedStart: string; // HH:mm
  plannedEnd?: string; // HH:mm
  durationSeconds?: number;
  status: ScheduleStatus;
  startedRecordId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoomMember {
  userId: string;
  displayName: string;
  emojiAvatar: string;
  status: 'ACTIVE' | 'LEFT';
  joinedAt: string;
  leftAt?: string;
}

export interface PartnerPresence {
  userId: string;
  displayName: string;
  emojiAvatar: string;
  email: string;
  timezone: string;
  joinedAt?: string;
  activity?: {
    title: string;
    categoryIcon: string;
    classification: Classification;
    startTime: string;
  };
}

export interface Room {
  id: string;
  members: RoomMember[];
  inviteCode: string;
  inviteLink: string;
  inviteExpiresAt?: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  type: 'ACTIVITY' | 'ROOM' | 'SYSTEM';
  title: string;
  body: string;
  readAt?: string;
  createdAt: string;
}

export interface DayBreakdown {
  date: string;
  productiveSeconds: number;
  neutralSeconds: number;
  leisureSeconds: number;
  unproductiveSeconds: number;
  noInfoSeconds: number;
}

export interface TimelineBlock {
  start: string; // HH:mm
  end: string; // HH:mm
  type: TimelineKind;
  activityId?: string;
  title?: string;
  categoryIcon?: string;
  classification?: Classification;
  privacy?: Privacy;
}

export interface ExportRow {
  date: string;
  startTime: string;
  endTime: string;
  activity: string;
  category: string;
  classification: Classification;
  durationMinutes: number;
  tags: string;
  description: string;
  privacy: Privacy;
  source: ActivitySource;
}
