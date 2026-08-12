import type {
  ActivityRecord,
  ActivityTemplate,
  AppNotification,
  Category,
  Classification,
  DayBreakdown,
  ExportRow,
  PartnerPresence,
  Privacy,
  Room,
  RoomMember,
  Schedule,
  Tag,
  TimelineBlock,
  TimerMode,
  User,
} from '@/types';
import { createClient as createSupabaseClient } from '@/utils/supabase/client';
import { clockFromMinutes, minutesFromClock, parseDateKey, toDateKey, weekRange } from '@/lib/utils';
import { CLASSIFICATION_ORDER } from '@/lib/classification';

let client: ReturnType<typeof createSupabaseClient> | null = null;
function db() {
  if (!client) client = createSupabaseClient();
  return client;
}

async function requireUserId(): Promise<string> {
  const { data, error } = await db().auth.getUser();
  if (error || !data.user) throw new Error('Not signed in');
  return data.user.id;
}

// ---------------------------------------------------------------------------
// DB row → TS type mappers
// ---------------------------------------------------------------------------

interface ProfileRow {
  id: string;
  google_id: string;
  email: string;
  display_name: string;
  emoji_avatar: string;
  timezone: string;
  onboarded: boolean;
  created_at: string;
}

interface UserPreferencesRow {
  overlap_enabled: boolean;
  default_privacy: Privacy;
}

interface NotificationPreferencesRow {
  activity_changes: boolean;
  in_app: boolean;
  browser_push: boolean;
}

interface CategoryRow {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  classification: Classification;
  created_at: string;
  updated_at: string;
}

interface TagRow {
  id: string;
  user_id: string;
  name: string;
}

interface TemplateRow {
  id: string;
  user_id: string;
  category_id: string;
  title: string;
  description: string | null;
  classification: Classification;
  created_at: string;
}

interface RecordRow {
  id: string;
  user_id: string;
  category_id: string;
  template_id: string | null;
  title: string;
  description: string | null;
  classification: Classification;
  source: ActivityRecord['source'];
  status: ActivityRecord['status'];
  privacy: Privacy;
  start_time: string;
  end_time: string | null;
  expected_end_time: string | null;
  duration_seconds: number;
  created_at: string;
  updated_at: string;
}

interface ScheduleRow {
  id: string;
  user_id: string;
  template_id: string;
  scheduled_date: string;
  planned_start: string;
  planned_end: string | null;
  status: Schedule['status'];
  started_record_id: string | null;
  created_at: string;
  updated_at: string;
}

interface RoomRow {
  id: string;
  created_by: string;
  invite_code: string;
  invite_link: string | null;
  invite_expires_at: string | null;
  created_at: string;
}

interface MembershipRow {
  room_id: string;
  user_id: string;
  status: 'ACTIVE' | 'LEFT';
  joined_at: string;
  left_at: string | null;
}

interface NotificationRow {
  id: string;
  user_id: string;
  type: AppNotification['type'];
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

function mapUser(profile: ProfileRow, prefs: UserPreferencesRow, notifPrefs: NotificationPreferencesRow): User {
  return {
    id: profile.id,
    googleId: profile.google_id,
    email: profile.email,
    displayName: profile.display_name,
    emojiAvatar: profile.emoji_avatar,
    timezone: profile.timezone,
    onboarded: profile.onboarded,
    preferences: {
      overlapEnabled: prefs.overlap_enabled,
      defaultPrivacy: prefs.default_privacy,
      notifications: {
        activityChanges: notifPrefs.activity_changes,
        inApp: notifPrefs.in_app,
        browserPush: notifPrefs.browser_push,
      },
    },
    createdAt: profile.created_at,
  };
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    icon: row.icon,
    classification: row.classification,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTag(row: TagRow): Tag {
  return { id: row.id, userId: row.user_id, name: row.name };
}

function mapTemplate(row: TemplateRow): ActivityTemplate {
  return {
    id: row.id,
    userId: row.user_id,
    categoryId: row.category_id,
    title: row.title,
    description: row.description ?? undefined,
    classification: row.classification,
    createdAt: row.created_at,
  };
}

function mapRecord(row: RecordRow, tagIds: string[]): ActivityRecord {
  return {
    id: row.id,
    userId: row.user_id,
    categoryId: row.category_id,
    title: row.title,
    description: row.description ?? undefined,
    classification: row.classification,
    source: row.source,
    status: row.status,
    privacy: row.privacy,
    tagIds,
    startTime: row.start_time,
    endTime: row.end_time ?? undefined,
    expectedEndTime: row.expected_end_time ?? undefined,
    durationSeconds: row.duration_seconds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSchedule(row: ScheduleRow): Schedule {
  return {
    id: row.id,
    userId: row.user_id,
    templateId: row.template_id,
    scheduledDate: row.scheduled_date,
    plannedStart: row.planned_start.slice(0, 5),
    plannedEnd: row.planned_end ? row.planned_end.slice(0, 5) : undefined,
    status: row.status,
    startedRecordId: row.started_record_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    readAt: row.read_at ?? undefined,
    createdAt: row.created_at,
  };
}

/** Attach tag ids to a list of record rows (single junction query). */
async function attachTagIds(rows: RecordRow[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (rows.length === 0) return map;
  const { data } = await db()
    .from('activity_tags')
    .select('record_id, tag_id')
    .in('record_id', rows.map((r) => r.id));
  for (const row of rows) map.set(row.id, []);
  for (const link of data ?? []) {
    map.get(link.record_id)?.push(link.tag_id);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Auth / user
// ---------------------------------------------------------------------------

export async function getSession(): Promise<User | null> {
  const { data, error } = await db().auth.getUser();
  if (error || !data.user) return null;
  const uid = data.user.id;

  const [profileResult, prefsResult, notifPrefsResult] = await Promise.all([
    db().from('profiles').select('*').eq('id', uid).maybeSingle(),
    db().from('user_preferences').select('*').eq('user_id', uid).maybeSingle(),
    db().from('notification_preferences').select('*').eq('user_id', uid).maybeSingle(),
  ]);

  // Recover if the signup trigger hasn't created the profile row yet (race on
  // first login). If the upsert is blocked by RLS, fall back to metadata so
  // the app still renders — the trigger covers this on normal signups.
  let profile = profileResult.data as ProfileRow | null;
  if (!profile) {
    const { data: inserted } = await db()
      .from('profiles')
      .upsert(
        {
          id: uid,
          google_id: (data.user.user_metadata.google_id as string) ?? data.user.id,
          email: data.user.email ?? '',
          display_name:
            (data.user.user_metadata.full_name as string) ?? data.user.email?.split('@')[0] ?? '',
        },
        { onConflict: 'id' },
      )
      .select()
      .single();
    profile = (inserted ?? null) as ProfileRow | null;
    if (!profile) {
      profile = {
        id: uid,
        google_id: (data.user.user_metadata.google_id as string) ?? uid,
        email: data.user.email ?? '',
        display_name:
          (data.user.user_metadata.full_name as string) ?? data.user.email?.split('@')[0] ?? '',
        emoji_avatar: '🚀',
        timezone: 'UTC',
        onboarded: false,
        created_at: new Date().toISOString(),
      };
    }
  }

  const prefs: UserPreferencesRow = prefsResult.data ?? { overlap_enabled: false, default_privacy: 'PUBLIC' };
  const notifPrefs: NotificationPreferencesRow = notifPrefsResult.data ?? {
    activity_changes: true,
    in_app: true,
    browser_push: false,
  };
  return mapUser(profile, prefs, notifPrefs);
}

export async function signInWithGoogle(): Promise<User> {
  const { origin } = window.location;
  await db().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${origin}/auth/callback` },
  });
  const user = await getSession();
  if (!user) throw new Error('Sign-in interrupted');
  return user;
}

export async function signOut(): Promise<void> {
  await db().auth.signOut();
}

export async function completeOnboarding(input: {
  displayName: string;
  emojiAvatar: string;
  timezone: string;
}): Promise<User> {
  const uid = await requireUserId();
  const { data: authData } = await db().auth.getUser();
  const { error } = await db()
    .from('profiles')
    .upsert(
      {
        id: uid,
        google_id: (authData?.user.user_metadata.google_id as string) ?? uid,
        email: authData?.user.email ?? '',
        display_name: input.displayName,
        emoji_avatar: input.emojiAvatar,
        timezone: input.timezone,
        onboarded: true,
      },
      { onConflict: 'id' },
    );
  if (error) throw new Error(`Could not save your profile: ${error.message}`);
  const user = await getSession();
  if (!user) throw new Error('Not signed in');
  return user;
}

export async function updateProfile(input: Partial<Pick<User, 'displayName' | 'emojiAvatar' | 'timezone'>>): Promise<User> {
  const uid = await requireUserId();
  const patch: Partial<Record<'display_name' | 'emoji_avatar' | 'timezone', string>> = {};
  if (input.displayName !== undefined) patch.display_name = input.displayName;
  if (input.emojiAvatar !== undefined) patch.emoji_avatar = input.emojiAvatar;
  if (input.timezone !== undefined) patch.timezone = input.timezone;

  if (Object.keys(patch).length > 0) {
    const { data, error } = await db()
      .from('profiles')
      .update(patch)
      .eq('id', uid)
      .select('id')
      .maybeSingle();
    if (error) throw new Error(`Could not save your profile: ${error.message}`);

    // Profile row missing (rare) — create it with auth metadata so NOT NULL
    // columns (google_id, email) are always populated.
    if (!data) {
      const { data: authData } = await db().auth.getUser();
      const { error: insertError } = await db().from('profiles').insert({
        id: uid,
        google_id: (authData?.user.user_metadata.google_id as string) ?? uid,
        email: authData?.user.email ?? '',
        display_name: patch.display_name ?? (authData?.user.user_metadata.full_name as string) ?? '',
        emoji_avatar: patch.emoji_avatar ?? '🚀',
        timezone: patch.timezone ?? 'UTC',
        onboarded: true,
      });
      if (insertError) throw new Error(`Could not save your profile: ${insertError.message}`);
    }
  }

  const user = await getSession();
  if (!user) throw new Error('Not signed in');
  return user;
}

export async function updatePreferences(input: Partial<User['preferences']>): Promise<User> {
  const uid = await requireUserId();
  if (input.overlapEnabled !== undefined || input.defaultPrivacy !== undefined) {
    const patch: Partial<Record<'overlap_enabled' | 'default_privacy', boolean | Privacy>> = {};
    if (input.overlapEnabled !== undefined) patch.overlap_enabled = input.overlapEnabled;
    if (input.defaultPrivacy !== undefined) patch.default_privacy = input.defaultPrivacy;
    const { error } = await db()
      .from('user_preferences')
      .upsert({ user_id: uid, ...patch }, { onConflict: 'user_id' });
    if (error) throw new Error(`Could not save your preferences: ${error.message}`);
  }
  if (input.notifications) {
    const patch: Partial<Record<'activity_changes' | 'in_app' | 'browser_push', boolean>> = {};
    if (input.notifications.activityChanges !== undefined) patch.activity_changes = input.notifications.activityChanges;
    if (input.notifications.inApp !== undefined) patch.in_app = input.notifications.inApp;
    if (input.notifications.browserPush !== undefined) patch.browser_push = input.notifications.browserPush;
    const { error } = await db()
      .from('notification_preferences')
      .upsert({ user_id: uid, ...patch }, { onConflict: 'user_id' });
    if (error) throw new Error(`Could not save your notification preferences: ${error.message}`);
  }
  const user = await getSession();
  if (!user) throw new Error('Not signed in');
  return user;
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function listCategories(): Promise<Category[]> {
  const uid = await requireUserId();
  const { data } = await db().from('categories').select('*').eq('user_id', uid).order('created_at', { ascending: true });
  return (data ?? []).map(mapCategory);
}

export async function createCategory(input: { name: string; icon: string; classification: Classification }): Promise<Category> {
  const uid = await requireUserId();
  const { data, error } = await db()
    .from('categories')
    .insert({
      user_id: uid,
      name: input.name.trim(),
      icon: input.icon,
      classification: input.classification,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Could not create category');
  return mapCategory(data as CategoryRow);
}

export async function updateCategory(id: string, input: Partial<Pick<Category, 'name' | 'icon' | 'classification'>>): Promise<Category> {
  const { data, error } = await db()
    .from('categories')
    .update({
      name: input.name,
      icon: input.icon,
      classification: input.classification,
    })
    .eq('id', id)
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Category not found');
  // Keep templates in sync with the category classification (as before).
  if (input.classification) {
    await db().from('activity_templates').update({ classification: input.classification }).eq('category_id', id);
  }
  return mapCategory(data as CategoryRow);
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await db().from('categories').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

export async function listTags(): Promise<Tag[]> {
  const uid = await requireUserId();
  const { data } = await db().from('tags').select('*').eq('user_id', uid).order('name');
  return (data ?? []).map(mapTag);
}

export async function createTag(name: string): Promise<Tag> {
  const uid = await requireUserId();
  const clean = name.trim().replace(/^#/, '').toLowerCase();
  const { data, error } = await db()
    .from('tags')
    .upsert({ user_id: uid, name: clean }, { onConflict: 'user_id,name', ignoreDuplicates: true })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Could not create tag');
  return mapTag(data as TagRow);
}

export async function deleteTag(id: string): Promise<void> {
  const { error } = await db().from('tags').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Activity templates
// ---------------------------------------------------------------------------

export async function listTemplates(): Promise<ActivityTemplate[]> {
  const uid = await requireUserId();
  const { data } = await db().from('activity_templates').select('*').eq('user_id', uid).order('created_at', { ascending: true });
  return (data ?? []).map(mapTemplate);
}

export async function createTemplate(input: { categoryId: string; title: string; description?: string }): Promise<ActivityTemplate> {
  const uid = await requireUserId();
  const { data: category } = await db().from('categories').select('classification').eq('id', input.categoryId).maybeSingle();
  if (!category) throw new Error('Category not found');
  const { data, error } = await db()
    .from('activity_templates')
    .insert({
      user_id: uid,
      category_id: input.categoryId,
      title: input.title.trim(),
      description: input.description,
      classification: category.classification,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Could not create template');
  return mapTemplate(data as TemplateRow);
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await db().from('activity_templates').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Activity records
// ---------------------------------------------------------------------------

export interface RecordFilters {
  from?: string; // date key inclusive
  to?: string; // date key inclusive
  categoryId?: string;
  classification?: Classification;
  tagId?: string;
  search?: string;
}

function recordMatches(record: ActivityRecord, filters: RecordFilters): boolean {
  if (filters.categoryId && record.categoryId !== filters.categoryId) return false;
  if (filters.classification && record.classification !== filters.classification) return false;
  if (filters.tagId && !record.tagIds.includes(filters.tagId)) return false;
  if (filters.search) {
    const q = filters.search.toLowerCase();
    if (!`${record.title} ${record.description ?? ''}`.toLowerCase().includes(q)) return false;
  }
  if (filters.from || filters.to) {
    if (!record.startTime) return false;
    const key = toDateKey(new Date(record.startTime));
    if (filters.from && key < filters.from) return false;
    if (filters.to && key > filters.to) return false;
  }
  return true;
}

export async function listRecords(filters: RecordFilters = {}): Promise<ActivityRecord[]> {
  const uid = await requireUserId();
  const { data } = await db()
    .from('activity_records')
    .select('*')
    .eq('user_id', uid)
    .order('start_time', { ascending: true });
  const rows = (data ?? []) as RecordRow[];
  const tagMap = await attachTagIds(rows);
  return rows
    .map((r) => mapRecord(r, tagMap.get(r.id) ?? []))
    .filter((r) => recordMatches(r, filters))
    .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''));
}

export async function getActiveRecord(): Promise<ActivityRecord | null> {
  const uid = await requireUserId();
  const { data } = await db()
    .from('activity_records')
    .select('*')
    .eq('user_id', uid)
    .eq('status', 'RUNNING')
    .order('start_time', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const row = data as RecordRow;
  const tagMap = await attachTagIds([row]);
  return mapRecord(row, tagMap.get(row.id) ?? []);
}

export interface StartTimerInput {
  templateId: string;
  mode: TimerMode;
  durationMinutes?: number;
}

export async function startTimer(input: StartTimerInput): Promise<ActivityRecord> {
  const uid = await requireUserId();
  const { data: template } = await db()
    .from('activity_templates')
    .select('*')
    .eq('id', input.templateId)
    .maybeSingle();
  if (!template) throw new Error('Activity not found');

  const { data: prefs } = await db()
    .from('user_preferences')
    .select('overlap_enabled, default_privacy')
    .eq('user_id', uid)
    .maybeSingle();

  const now = new Date();

  if (!prefs?.overlap_enabled) {
    const { data: running } = await db().from('activity_records').select('id, start_time').eq('user_id', uid).eq('status', 'RUNNING');
    for (const r of running ?? []) {
      await db()
        .from('activity_records')
        .update({
          status: 'COMPLETED',
          end_time: now.toISOString(),
          duration_seconds: Math.max(1, Math.round((now.getTime() - new Date(r.start_time).getTime()) / 1000)),
        })
        .eq('id', r.id);
    }
  }

  const expectedEndTime =
    input.mode === 'FIXED_DURATION' && input.durationMinutes
      ? new Date(now.getTime() + input.durationMinutes * 60_000).toISOString()
      : null;

  const { data, error } = await db()
    .from('activity_records')
    .insert({
      user_id: uid,
      category_id: template.category_id,
      title: template.title,
      description: template.description,
      classification: template.classification,
      source: 'TIMER',
      status: 'RUNNING',
      privacy: prefs?.default_privacy ?? 'PUBLIC',
      start_time: now.toISOString(),
      expected_end_time: expectedEndTime,
      duration_seconds: 0,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Could not start timer');
  return mapRecord(data as RecordRow, []);
}

export async function stopRecord(id: string): Promise<ActivityRecord> {
  const { data: existing } = await db().from('activity_records').select('id, status, start_time').eq('id', id).maybeSingle();
  if (!existing) throw new Error('Record not found');
  if (existing.status !== 'RUNNING') {
    const { data } = await db().from('activity_records').select('*').eq('id', id).single();
    return mapRecord(data as RecordRow, []);
  }
  const now = new Date();
  const { data, error } = await db()
    .from('activity_records')
    .update({
      status: 'COMPLETED',
      end_time: now.toISOString(),
      duration_seconds: Math.max(1, Math.round((now.getTime() - new Date(existing.start_time).getTime()) / 1000)),
    })
    .eq('id', id)
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Record not found');
  return mapRecord(data as RecordRow, []);
}

export interface ManualRecordInput {
  templateId: string;
  start: string; // HH:mm
  end: string; // HH:mm
  dateKey: string; // YYYY-MM-DD
  tagIds: string[];
  privacy: Privacy;
  description?: string;
}

export async function createManualRecord(input: ManualRecordInput): Promise<ActivityRecord> {
  const uid = await requireUserId();
  const { data: template } = await db()
    .from('activity_templates')
    .select('*')
    .eq('id', input.templateId)
    .maybeSingle();
  if (!template) throw new Error('Activity not found');

  const start = new Date(parseDateKey(input.dateKey));
  start.setHours(Math.floor(minutesFromClock(input.start) / 60), minutesFromClock(input.start) % 60, 0, 0);
  const end = new Date(start);
  if (minutesFromClock(input.end) < minutesFromClock(input.start)) end.setDate(end.getDate() + 1);
  end.setHours(Math.floor(minutesFromClock(input.end) / 60), minutesFromClock(input.end) % 60, 0, 0);

  const { data, error } = await db()
    .from('activity_records')
    .insert({
      user_id: uid,
      category_id: template.category_id,
      title: template.title,
      description: input.description,
      classification: template.classification,
      source: 'MANUAL',
      status: 'COMPLETED',
      privacy: input.privacy,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      duration_seconds: Math.max(60, Math.round((end.getTime() - start.getTime()) / 1000)),
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Could not create record');

  const recordId = (data as RecordRow).id;
  if (input.tagIds.length > 0) {
    await db()
      .from('activity_tags')
      .insert(input.tagIds.map((tag_id) => ({ record_id: recordId, tag_id })));
  }
  return mapRecord(data as RecordRow, input.tagIds);
}

export async function updateRecord(id: string, input: Partial<Pick<ActivityRecord, 'title' | 'description' | 'privacy' | 'tagIds' | 'startTime' | 'endTime'>>): Promise<ActivityRecord> {
  const patch: Partial<Record<string, string | number | null>> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.privacy !== undefined) patch.privacy = input.privacy;
  if (input.startTime !== undefined) patch.start_time = input.startTime;
  if (input.endTime !== undefined) patch.end_time = input.endTime;

  const { data: existing } = await db().from('activity_records').select('*').eq('id', id).maybeSingle();
  if (!existing) throw new Error('Record not found');
  const nextStart = patch.start_time ?? existing.start_time;
  const nextEnd = patch.end_time ?? existing.end_time;
  if (nextStart && nextEnd) {
    patch.duration_seconds = Math.max(60, Math.round((new Date(nextEnd).getTime() - new Date(nextStart).getTime()) / 1000));
  }

  const { data, error } = await db().from('activity_records').update(patch).eq('id', id).select().single();
  if (error || !data) throw new Error(error?.message ?? 'Record not found');

  const recordId = (data as RecordRow).id;
  let tagIds: string[];
  if (input.tagIds) {
    await db().from('activity_tags').delete().eq('record_id', recordId);
    tagIds = input.tagIds;
    if (input.tagIds.length > 0) {
      await db().from('activity_tags').insert(input.tagIds.map((tag_id) => ({ record_id: recordId, tag_id })));
    }
  } else {
    tagIds = (await attachTagIds([data as RecordRow])).get(recordId) ?? [];
  }
  return mapRecord(data as RecordRow, tagIds);
}

export async function deleteRecord(id: string): Promise<void> {
  const { error } = await db().from('activity_records').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Schedules
// ---------------------------------------------------------------------------

export async function listSchedules(dateKey?: string): Promise<Schedule[]> {
  const uid = await requireUserId();
  let query = db().from('schedules').select('*').eq('user_id', uid).order('planned_start');
  if (dateKey) query = query.eq('scheduled_date', dateKey);
  const { data } = await query;
  return ((data ?? []) as ScheduleRow[]).map(mapSchedule);
}

export interface CreateScheduleInput {
  templateId: string;
  scheduledDate: string;
  plannedStart: string;
  durationMinutes: number;
}

export async function createSchedule(input: CreateScheduleInput): Promise<Schedule> {
  const uid = await requireUserId();
  const { data: template } = await db()
    .from('activity_templates')
    .select('id')
    .eq('id', input.templateId)
    .maybeSingle();
  if (!template) throw new Error('Activity not found');

  const plannedEndMinutes = minutesFromClock(input.plannedStart) + input.durationMinutes;
  const { data, error } = await db()
    .from('schedules')
    .insert({
      user_id: uid,
      template_id: input.templateId,
      scheduled_date: input.scheduledDate,
      planned_start: input.plannedStart,
      planned_end: clockFromMinutes(plannedEndMinutes),
      duration_seconds: input.durationMinutes * 60,
      status: 'PENDING',
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Could not create schedule');
  return mapSchedule(data as ScheduleRow);
}

export async function startSchedule(id: string): Promise<{ schedule: Schedule; record: ActivityRecord }> {
  const uid = await requireUserId();
  const { data: schedule } = await db().from('schedules').select('*').eq('id', id).maybeSingle();
  if (!schedule) throw new Error('Schedule not found');
  const row = schedule as ScheduleRow;

  const { data: template } = await db()
    .from('activity_templates')
    .select('*')
    .eq('id', row.template_id)
    .maybeSingle();
  if (!template) throw new Error('Activity not found');

  const { data: prefs } = await db()
    .from('user_preferences')
    .select('overlap_enabled, default_privacy')
    .eq('user_id', uid)
    .maybeSingle();

  const now = new Date();

  if (!prefs?.overlap_enabled) {
    const { data: running } = await db().from('activity_records').select('id, start_time').eq('user_id', uid).eq('status', 'RUNNING');
    for (const r of running ?? []) {
      await db()
        .from('activity_records')
        .update({
          status: 'COMPLETED',
          end_time: now.toISOString(),
          duration_seconds: Math.max(1, Math.round((now.getTime() - new Date(r.start_time).getTime()) / 1000)),
        })
        .eq('id', r.id);
    }
  }

  const expectedEndTime = row.planned_end
    ? (() => {
        const d = new Date(parseDateKey(row.scheduled_date));
        d.setHours(Math.floor(minutesFromClock(row.planned_end) / 60), minutesFromClock(row.planned_end) % 60, 0, 0);
        if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
        return d.toISOString();
      })()
    : null;

  const { data: recordData, error: recordError } = await db()
    .from('activity_records')
    .insert({
      user_id: uid,
      category_id: template.category_id,
      title: template.title,
      description: template.description,
      classification: template.classification,
      source: 'SCHEDULE',
      status: 'RUNNING',
      privacy: prefs?.default_privacy ?? 'PUBLIC',
      start_time: now.toISOString(),
      expected_end_time: expectedEndTime,
      duration_seconds: 0,
    })
    .select()
    .single();
  if (recordError || !recordData) throw new Error(recordError?.message ?? 'Could not start schedule');

  const { data: updated } = await db()
    .from('schedules')
    .update({ status: 'STARTED', started_record_id: recordData.id })
    .eq('id', id)
    .select()
    .single();

  return {
    schedule: mapSchedule((updated ?? schedule) as ScheduleRow),
    record: mapRecord(recordData as RecordRow, []),
  };
}

export async function deleteSchedule(id: string): Promise<void> {
  const { error } = await db().from('schedules').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Room
// ---------------------------------------------------------------------------

function inviteLinkFor(code: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://currentstate.app';
  return `${origin}/join/${code}`;
}

function inviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function myRoomMemberships(): Promise<MembershipRow[]> {
  const { data } = await db().from('room_memberships').select('*').eq('user_id', (await requireUserId()));
  return (data ?? []) as MembershipRow[];
}

/** The id of the partner sharing my active room, or null if none. */
async function partnerUserId(): Promise<string | null> {
  const uid = await requireUserId();
  const { data: membership } = await db()
    .from('room_memberships')
    .select('room_id')
    .eq('user_id', uid)
    .eq('status', 'ACTIVE')
    .limit(1)
    .maybeSingle();
  if (!membership) return null;
  const { data: partners } = await db()
    .from('room_memberships')
    .select('user_id')
    .eq('room_id', membership.room_id)
    .eq('status', 'ACTIVE')
    .neq('user_id', uid);
  return (partners ?? [])[0]?.user_id ?? null;
}

async function buildRoom(row: RoomRow): Promise<Room> {
  const { data: members } = await db()
    .from('room_memberships')
    .select('*')
    .eq('room_id', row.id)
    .order('joined_at');
  const memberRows = (members ?? []) as MembershipRow[];
  const { data: profileRows } = await db()
    .from('profiles')
    .select('id, display_name, emoji_avatar')
    .in('id', memberRows.map((m) => m.user_id));
  const profileById = new Map(
    ((profileRows ?? []) as Array<{ id: string; display_name: string; emoji_avatar: string }>).map((p) => [p.id, p]),
  );
  return {
    id: row.id,
    members: memberRows.map((m): RoomMember => ({
      userId: m.user_id,
      displayName: profileById.get(m.user_id)?.display_name ?? 'Partner',
      emojiAvatar: profileById.get(m.user_id)?.emoji_avatar ?? '🚀',
      status: m.status,
      joinedAt: m.joined_at,
      leftAt: m.left_at ?? undefined,
    })),
    inviteCode: row.invite_code,
    inviteLink: row.invite_link ?? inviteLinkFor(row.invite_code),
    inviteExpiresAt: row.invite_expires_at ?? undefined,
    createdAt: row.created_at,
  };
}

export async function getRoom(): Promise<Room | null> {
  const memberships = await myRoomMemberships();
  const active = memberships.find((m) => m.status === 'ACTIVE');
  if (!active) return null;
  const { data } = await db().from('rooms').select('*').eq('id', active.room_id).maybeSingle();
  if (!data) return null;
  return buildRoom(data as RoomRow);
}

export async function createRoom(): Promise<Room> {
  const uid = await requireUserId();
  const code = inviteCode();
  const { data: room, error } = await db()
    .from('rooms')
    .insert({
      created_by: uid,
      invite_code: code,
      invite_link: inviteLinkFor(code),
      invite_expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    })
    .select()
    .single();
  if (error || !room) throw new Error(error?.message ?? 'Could not create room');
  await db().from('room_memberships').insert({ room_id: room.id, user_id: uid, status: 'ACTIVE' });
  return buildRoom(room as RoomRow);
}

export async function joinRoom(code: string): Promise<Room> {
  const uid = await requireUserId();
  const normalized = code.trim().toUpperCase();
  const { data: room } = await db()
    .from('rooms')
    .select('*')
    .eq('invite_code', normalized)
    .maybeSingle();
  if (!room) throw new Error('That invite code does not match any room');

  const existing = await myRoomMemberships();
  const current = existing.find((m) => m.room_id === room.id);
  if (current?.status === 'ACTIVE') return buildRoom(room as RoomRow);
  if (current?.status === 'LEFT') {
    await db().from('room_memberships').update({ status: 'ACTIVE', left_at: null }).eq('room_id', room.id).eq('user_id', uid);
    return buildRoom(room as RoomRow);
  }

  // You can only be active in one room at a time. If you're already active in
  // another room, leave it first (a user may not hold two ACTIVE memberships).
  const previousActive = existing.find((m) => m.status === 'ACTIVE' && m.room_id !== room.id);
  if (previousActive) {
    await db()
      .from('room_memberships')
      .update({ status: 'LEFT', left_at: new Date().toISOString() })
      .eq('user_id', uid)
      .eq('status', 'ACTIVE');
  }

  const { error } = await db()
    .from('room_memberships')
    .insert({ room_id: room.id, user_id: uid, status: 'ACTIVE' });

  if (error) {
    // Joining failed (e.g. the room is full) — restore the previous room.
    if (previousActive) {
      await db()
        .from('room_memberships')
        .update({ status: 'ACTIVE', left_at: null })
        .eq('room_id', previousActive.room_id)
        .eq('user_id', uid);
    }
    throw new Error(error.message);
  }
  return buildRoom(room as RoomRow);
}

export async function leaveRoom(): Promise<void> {
  const uid = await requireUserId();
  await db()
    .from('room_memberships')
    .update({ status: 'LEFT', left_at: new Date().toISOString() })
    .eq('user_id', uid)
    .eq('status', 'ACTIVE');
  await db().from('notifications').insert({
    user_id: uid,
    type: 'ROOM',
    title: 'You left the room',
    body: 'Your activity history stays with you.',
  });
}

export async function refreshInvite(): Promise<Room> {
  const room = await getRoom();
  if (!room) throw new Error('No room');
  const code = inviteCode();
  const { data, error } = await db()
    .from('rooms')
    .update({
      invite_code: code,
      invite_link: inviteLinkFor(code),
      invite_expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    })
    .eq('id', room.id)
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Could not refresh invite');
  return buildRoom(data as RoomRow);
}

export async function getPartnerPresence(): Promise<PartnerPresence | null> {
  const uid = await requireUserId();
  const { data: memberships } = await db()
    .from('room_memberships')
    .select('*')
    .eq('user_id', uid)
    .eq('status', 'ACTIVE')
    .limit(1)
    .maybeSingle();
  if (!memberships) return null;

  const { data: partners } = await db()
    .from('room_memberships')
    .select('user_id')
    .eq('room_id', memberships.room_id)
    .eq('status', 'ACTIVE')
    .neq('user_id', uid);
  const partnerId = (partners ?? [])[0]?.user_id;
  if (!partnerId) return null;

  const { data: profile } = await db()
    .from('profiles')
    .select('display_name, emoji_avatar, email, timezone')
    .eq('id', partnerId)
    .maybeSingle();

  const { data: running } = await db()
    .from('activity_records')
    .select('title, category_id, classification, start_time, privacy')
    .eq('user_id', partnerId)
    .eq('status', 'RUNNING')
    .order('start_time', { ascending: false })
    .limit(1)
    .maybeSingle();

  let categoryIcon: string | undefined;
  if (running) {
    const { data: category } = await db()
      .from('categories')
      .select('icon')
      .eq('id', running.category_id)
      .maybeSingle();
    categoryIcon = category?.icon;
  }

  return {
    userId: partnerId,
    displayName: profile?.display_name ?? 'Partner',
    emojiAvatar: profile?.emoji_avatar ?? '🦊',
    email: profile?.email ?? '',
    timezone: profile?.timezone ?? 'UTC',
    joinedAt: (memberships as MembershipRow).joined_at,
    activity:
      running && running.privacy === 'PUBLIC'
        ? {
            title: running.title,
            categoryIcon: categoryIcon ?? '',
            classification: running.classification,
            startTime: running.start_time,
          }
        : undefined,
  };
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function listNotifications(): Promise<AppNotification[]> {
  const { data } = await db().from('notifications').select('*').order('created_at', { ascending: false });
  return ((data ?? []) as NotificationRow[]).map(mapNotification);
}

export async function markAllNotificationsRead(): Promise<void> {
  const uid = await requireUserId();
  await db()
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', uid)
    .is('read_at', null);
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

function dayRecordSeconds(records: ActivityRecord[], key: string): { records: ActivityRecord[]; start: number; end: number } {
  const dayRecords = records.filter((r) => {
    if (!r.startTime) return false;
    const end = r.endTime ?? new Date().toISOString();
    if (!r.startTime || !end) return false;
    return toDateKey(new Date(r.startTime)) === key;
  });
  const start = new Date(parseDateKey(key)).getTime();
  const end = start + 86_400_000;
  return { records: dayRecords, start, end };
}

export async function getDayBreakdown(dateKey: string): Promise<DayBreakdown> {
  return computeDayBreakdown(await listRecords(), dateKey);
}

function computeDayBreakdown(records: ActivityRecord[], dateKey: string): DayBreakdown {
  const { records: dayRecords, start, end } = dayRecordSeconds(records, dateKey);
  const breakdown: Record<Classification, number> = {
    PRODUCTIVE: 0,
    NEUTRAL: 0,
    LEISURE: 0,
    UNPRODUCTIVE: 0,
  };

  const overlaps: Array<{ start: number; end: number }> = [];
  for (const r of dayRecords) {
    const endTime = r.endTime ?? new Date().toISOString();
    const s = Math.max(start, new Date(r.startTime!).getTime());
    const e = Math.min(end, new Date(endTime).getTime());
    if (e > s) {
      breakdown[r.classification] += e - s;
      overlaps.push({ start: s, end: e });
    }
  }

  overlaps.sort((a, b) => a.start - b.start);
  let cursor = start;
  let noActivity = 0;
  for (const seg of overlaps) {
    if (seg.start > cursor) noActivity += seg.start - cursor;
    cursor = Math.max(cursor, seg.end);
  }
  if (cursor < end) noActivity += end - cursor;

  const toSec = (ms: number) => Math.round(ms / 1000);
  return {
    date: dateKey,
    productiveSeconds: toSec(breakdown.PRODUCTIVE),
    neutralSeconds: toSec(breakdown.NEUTRAL),
    leisureSeconds: toSec(breakdown.LEISURE),
    unproductiveSeconds: toSec(breakdown.UNPRODUCTIVE),
    noInfoSeconds: toSec(noActivity),
  };
}

export async function getWeekTrend(dateKey: string): Promise<DayBreakdown[]> {
  return computeWeekTrend(await listRecords(), dateKey);
}

function computeWeekTrend(records: ActivityRecord[], dateKey: string): DayBreakdown[] {
  const { start, end } = weekRange(dateKey);
  const result: DayBreakdown[] = [];
  const cursor = new Date(parseDateKey(start));
  while (toDateKey(cursor) <= end) {
    result.push(computeDayBreakdown(records, toDateKey(cursor)));
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

export interface BreakdownSlice {
  key: string;
  label: string;
  icon?: string;
  seconds: number;
  classification: Classification;
}

export async function getCategoryBreakdown(range: { from?: string; to?: string } = {}): Promise<BreakdownSlice[]> {
  const [records, categories] = await Promise.all([listRecords(), listCategories()]);
  const byId = new Map(categories.map((c) => [c.id, c]));
  return computeCategoryBreakdown(records, (id) => byId.get(id), range);
}

function computeCategoryBreakdown(
  records: ActivityRecord[],
  labelOf: (categoryId: string) => { name: string; icon?: string; classification: Classification } | undefined,
  range: { from?: string; to?: string } = {},
): BreakdownSlice[] {
  const matching = records.filter((r) => {
    if (!r.endTime || r.status !== 'COMPLETED') return false;
    const key = toDateKey(new Date(r.endTime));
    if (range.from && key < range.from) return false;
    if (range.to && key > range.to) return false;
    return true;
  });
  const byCategory = new Map<string, { seconds: number; category: { name: string; icon?: string; classification: Classification } }>();
  for (const r of matching) {
    const category = labelOf(r.categoryId);
    const seconds = Math.max(0, (new Date(r.endTime!).getTime() - new Date(r.startTime!).getTime()) / 1000);
    const entry = byCategory.get(r.categoryId) ?? {
      seconds: 0,
      category: category ?? { name: 'Unknown', classification: 'NEUTRAL' as Classification },
    };
    entry.seconds += seconds;
    byCategory.set(r.categoryId, entry);
  }
  return [...byCategory.entries()]
    .map(([key, { seconds, category }]) => ({
      key,
      label: category.name,
      icon: category.icon,
      seconds: Math.round(seconds),
      classification: category.classification,
    }))
    .sort((a, b) => b.seconds - a.seconds);
}

export async function getActivityBreakdown(range: { from?: string; to?: string } = {}): Promise<BreakdownSlice[]> {
  return computeActivityBreakdown(await listRecords(), range);
}

function computeActivityBreakdown(records: ActivityRecord[], range: { from?: string; to?: string } = {}): BreakdownSlice[] {
  const matching = records.filter((r) => {
    if (!r.endTime || r.status !== 'COMPLETED') return false;
    const key = toDateKey(new Date(r.endTime));
    if (range.from && key < range.from) return false;
    if (range.to && key > range.to) return false;
    return true;
  });
  const byTitle = new Map<string, { seconds: number; classification: Classification }>();
  for (const r of matching) {
    const seconds = Math.max(0, (new Date(r.endTime!).getTime() - new Date(r.startTime!).getTime()) / 1000);
    const entry = byTitle.get(r.title) ?? { seconds: 0, classification: r.classification };
    entry.seconds += seconds;
    byTitle.set(r.title, entry);
  }
  return [...byTitle.entries()]
    .map(([key, { seconds, classification }]) => ({
      key,
      label: key,
      seconds: Math.round(seconds),
      classification,
    }))
    .sort((a, b) => b.seconds - a.seconds);
}

export async function getTimeline(dateKey: string): Promise<TimelineBlock[]> {
  const records = await listRecords();
  const schedules = await listSchedules(dateKey);
  const categories = await listCategories();
  const day = parseDateKey(dateKey);
  const dayStart = day.getTime();
  const dayEnd = dayStart + 86_400_000;

  const dayRecords = records
    .filter((r) => r.startTime)
    .map((r) => ({
      start: new Date(r.startTime!).getTime(),
      end: r.endTime ? new Date(r.endTime!).getTime() : Date.now(),
      record: r,
    }))
    .filter((r) => r.end > dayStart && r.start < dayEnd)
    .sort((a, b) => a.start - b.start);

  const noInfo = schedules
    .filter((s) => s.scheduledDate === dateKey && s.status === 'NO_INFO')
    .map((s) => ({
      start: dayStart + minutesFromClock(s.plannedStart) * 60_000,
      end: dayStart + (minutesFromClock(s.plannedEnd ?? s.plannedStart) + 30) * 60_000,
    }));

  const blocks: TimelineBlock[] = [];
  const fmt = (t: number) => {
    const d = new Date(t);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  let cursor = dayStart;
  const segments: Array<TimelineBlock & { s: number; e: number }> = [];

  for (const { start, end, record } of dayRecords) {
    if (start > cursor) {
      segments.push({ start: fmt(cursor), end: fmt(start), type: 'NO_ACTIVITY', s: cursor, e: start });
    }
    segments.push({
      start: fmt(start),
      end: fmt(end),
      type: 'ACTIVITY',
      s: start,
      e: end,
      activityId: record.id,
      title: record.title,
      categoryIcon: categories.find((c) => c.id === record.categoryId)?.icon,
      classification: record.classification,
      privacy: record.privacy,
    });
    cursor = Math.max(cursor, end);
  }
  for (const { start, end } of noInfo) {
    if (start < dayEnd && end > dayStart) {
      segments.push({
        start: fmt(Math.max(start, dayStart)),
        end: fmt(Math.min(end, dayEnd)),
        type: 'NO_INFO',
        s: Math.max(start, dayStart),
        e: Math.min(end, dayEnd),
      });
    }
  }
  if (cursor < dayEnd) {
    segments.push({ start: fmt(cursor), end: fmt(dayEnd), type: 'NO_ACTIVITY', s: cursor, e: dayEnd });
  }

  segments.sort((a, b) => a.s - b.s);
  blocks.push(
    ...segments.map(({ s, e, ...block }) => {
      const isTail = e === dayEnd;
      return {
        ...block,
        end: isTail && block.type === 'NO_ACTIVITY' ? 'Now' : block.end,
        start: block.start,
      };
    }),
  );
  return blocks;
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export async function exportRecords(format: 'csv' | 'json'): Promise<{ content: string; filename: string; type: string }> {
  const records = await listRecords();
  const categories = await listCategories();
  const tags = await listTags();
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const rows = buildExportRows(records, categoryById, tags);
  return serializeExport(rows, format, 'currentstate-history');
}

/** A completed record shared by my room partner, with category resolved. */
export interface PartnerHistoryEntry extends ActivityRecord {
  categoryName: string;
  categoryIcon: string;
}

/** Full viewable history of the room partner (read-only; only what they share publicly). */
export async function getPartnerHistory(): Promise<PartnerHistoryEntry[]> {
  return partnerSharedRecords();
}

/** Fetch the partner's shared (COMPLETED, PUBLIC) records with category resolved. */
async function partnerSharedRecords(): Promise<PartnerHistoryEntry[]> {
  const partnerId = await partnerUserId();
  if (!partnerId) return [];

  const [recordsResult, categoriesResult] = await Promise.all([
    db()
      .from('activity_records')
      .select('*')
      .eq('user_id', partnerId)
      .eq('status', 'COMPLETED')
      .order('start_time', { ascending: false })
      .limit(500),
    db().from('categories').select('id, name, icon').eq('user_id', partnerId),
  ]);
  const rows = (recordsResult.data ?? []) as RecordRow[];
  const categoryById = new Map(
    ((categoriesResult.data ?? []) as Array<{ id: string; name: string; icon: string }>).map((c) => [c.id, c]),
  );

  return rows
    .map((r) => {
      const record = mapRecord(r, []);
      const category = categoryById.get(record.categoryId);
      return {
        ...record,
        categoryName: category?.name ?? '',
        categoryIcon: category?.icon ?? '',
      };
    })
    .filter((r) => r.privacy === 'PUBLIC' && r.startTime && r.endTime);
}

/** Partner week trend over shared records (read-only). */
export async function getPartnerWeekTrend(dateKey: string): Promise<DayBreakdown[]> {
  return computeWeekTrend(await partnerSharedRecords(), dateKey);
}

/** Partner category mix over shared records (read-only). */
export async function getPartnerCategoryBreakdown(
  range: { from?: string; to?: string } = {},
): Promise<BreakdownSlice[]> {
  const entries = await partnerSharedRecords();
  const byId = new Map(
    entries.map((e) => [e.categoryId, { name: e.categoryName, icon: e.categoryIcon, classification: e.classification }]),
  );
  return computeCategoryBreakdown(entries, (id) => byId.get(id), range);
}

/** Partner activity breakdown over shared records (read-only). */
export async function getPartnerActivityBreakdown(
  range: { from?: string; to?: string } = {},
): Promise<BreakdownSlice[]> {
  return computeActivityBreakdown(await partnerSharedRecords(), range);
}

export async function exportPartnerRecords(
  format: 'csv' | 'json',
): Promise<{ content: string; filename: string; type: string }> {
  const entries = await getPartnerHistory();
  const rows: ExportRow[] = entries
    .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''))
    .map((r) => {
      const start = new Date(r.startTime!);
      const end = new Date(r.endTime!);
      return {
        date: toDateKey(start),
        startTime: `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`,
        endTime: `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`,
        activity: r.title,
        category: r.categoryName,
        classification: r.classification,
        durationMinutes: Math.round((end.getTime() - start.getTime()) / 60_000),
        tags: '',
        description: r.description ?? '',
        privacy: r.privacy,
        source: r.source,
      };
    });
  return serializeExport(rows, format, 'partner-history');
}

function buildExportRows(
  records: ActivityRecord[],
  categoryById: Map<string, { name: string }>,
  tags: Tag[],
): ExportRow[] {
  return records
    .filter((r) => r.startTime && r.endTime)
    .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''))
    .map((r) => {
      const category = categoryById.get(r.categoryId);
      const start = new Date(r.startTime!);
      const end = new Date(r.endTime!);
      const tagNames = r.tagIds
        .map((id) => tags.find((t) => t.id === id)?.name)
        .filter(Boolean)
        .join(', ');
      return {
        date: toDateKey(start),
        startTime: `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`,
        endTime: `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`,
        activity: r.title,
        category: category?.name ?? '',
        classification: r.classification,
        durationMinutes: Math.round((end.getTime() - start.getTime()) / 60_000),
        tags: tagNames,
        description: r.description ?? '',
        privacy: r.privacy,
        source: r.source,
      };
    });
}

function serializeExport(
  rows: ExportRow[],
  format: 'csv' | 'json',
  prefix: string,
): { content: string; filename: string; type: string } {
  const date = toDateKey(new Date());
  if (format === 'json') {
    return {
      content: JSON.stringify(rows, null, 2),
      filename: `${prefix}-${date}.json`,
      type: 'application/json',
    };
  }
  const header = ['Date', 'Start Time', 'End Time', 'Activity', 'Category', 'Classification', 'Duration (min)', 'Tags', 'Description', 'Privacy', 'Source'];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    header.join(','),
    ...rows.map((r) =>
      [r.date, r.startTime, r.endTime, escape(r.activity), escape(r.category), r.classification, String(r.durationMinutes), escape(r.tags), escape(r.description), r.privacy, r.source].join(','),
    ),
  ];
  return {
    content: lines.join('\n'),
    filename: `${prefix}-${date}.csv`,
    type: 'text/csv',
  };
}

// ---------------------------------------------------------------------------
// Data management
// ---------------------------------------------------------------------------

/** Wipe all app data for the signed-in user (settings danger zone). */
export async function clearAllData(): Promise<void> {
  const uid = await requireUserId();
  const { data: recordRows } = await db()
    .from('activity_records')
    .select('id')
    .eq('user_id', uid) as { data: Array<{ id: string }> | null };
  const ids = (recordRows ?? []).map((r) => r.id);
  if (ids.length > 0) {
    await db().from('activity_tags').delete().in('record_id', ids);
  }
  await db().from('activity_records').delete().eq('user_id', uid);
  await db().from('schedules').delete().eq('user_id', uid);
  await db().from('activity_templates').delete().eq('user_id', uid);
  await db().from('notifications').delete().eq('user_id', uid);
  await db().from('categories').delete().eq('user_id', uid);
  await db().from('tags').delete().eq('user_id', uid);
}

// ---------------------------------------------------------------------------
// Realtime seam (drop-in for the old local simulation)
// ---------------------------------------------------------------------------

type Listener = () => void;
const listeners = new Set<Listener>();
let channelSubscribed = false;

/** Subscribe to Supabase realtime changes for this user's data. */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  if (!channelSubscribed) {
    channelSubscribed = true;
    const supabase = db();
    const channel = supabase
      .channel('currentstate-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity_records' },
        () => notifyRealtime(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => notifyRealtime(),
      )
      .subscribe();
    listeners.add(() => {
      void supabase.removeChannel(channel);
    });
  }
  return () => listeners.delete(listener);
}

export function notifyRealtime(): void {
  listeners.forEach((l) => l());
}

export const analyticsUtils = {
  CLASSIFICATION_ORDER,
};
