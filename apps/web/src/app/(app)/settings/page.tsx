'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bell,
  Check,
  LogOut,
  Mail,
  RefreshCw,
  Save,
  Shield,
  SlidersHorizontal,
  Sun,
  UserRound,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import * as api from '@/lib/api';
import { useAuth } from '@/features/auth/auth-provider';
import { useTheme } from '@/hooks/use-theme';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Toggle } from '@/components/ui/toggle';
import { Field, Input, Select } from '@/components/ui/input';
import { cn, EMOJI_AVATARS, formatDayLabel } from '@/lib/utils';
import type { Privacy } from '@/types';

const TIMEZONES = [
  'Asia/Kathmandu',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Los_Angeles',
  'UTC',
];

export default function SettingsPage() {
  const { user, updateProfile, updatePreferences, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState('');
  const [avatar, setAvatar] = useState('🚀');
  const [timezone, setTimezone] = useState('Asia/Kathmandu');
  const [saved, setSaved] = useState(false);

  const saveProfile = useMutation({
    mutationFn: () =>
      updateProfile({ displayName: displayName.trim(), emojiAvatar: avatar, timezone }),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    },
  });

  const savePreference = useMutation({
    mutationFn: (input: Partial<NonNullable<typeof user>['preferences']>) => updatePreferences(input),
  });

  const clearAllData = useMutation({
    mutationFn: async () => {
      await api.clearAllData();
      queryClient.removeQueries();
      router.replace('/');
    },
  });

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName);
    setAvatar(user.emojiAvatar);
    setTimezone(user.timezone);
  }, [user]);

  if (!user) return null;

  const profileDirty =
    displayName.trim() !== user.displayName ||
    avatar !== user.emojiAvatar ||
    timezone !== user.timezone;

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Your profile and preferences. Changes save to your account and survive room changes."
      />

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="min-w-0 space-y-5 lg:col-span-3">
          <Section icon={<UserRound className="h-4 w-4" />} title="Profile" description="How your partner sees you — separate from your Google account.">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="flex flex-col items-center gap-2">
                <Avatar emoji={avatar} size="xl" className="border-2 border-current/30" />
                <span className="text-xs text-slate-500">Live preview</span>
              </div>

              <div className="min-w-0 flex-1 space-y-4">
                <Field label="Display name">
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="How should your partner see you?"
                    maxLength={40}
                  />
                </Field>

                <Field label="Timezone" hint="Used for your day, week, and analytics boundaries.">
                  <Select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">Choose an avatar</p>
              <div className="flex flex-wrap gap-2">
                {EMOJI_AVATARS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setAvatar(emoji)}
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-xl border text-xl transition-all',
                      avatar === emoji
                        ? 'border-cyan-300/70 bg-cyan-400/15 shadow-[0_0_0_2px_rgba(125,211,252,0.25)]'
                        : 'border-slate-500/25 bg-ink-elevated/60 hover:border-slate-400/40',
                    )}
                    aria-label={`Avatar ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              {saveProfile.error ? (
                <p className="mb-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                  {saveProfile.error.message}
                </p>
              ) : null}
              <div className="flex justify-end">
                <Button
                  onClick={() => saveProfile.mutate()}
                  disabled={!profileDirty || !displayName.trim()}
                  loading={saveProfile.isPending}
                >
                  {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                  {saved ? 'Saved' : 'Save changes'}
                </Button>
              </div>
            </div>
          </Section>

          <Section icon={<SlidersHorizontal className="h-4 w-4" />} title="Tracking preferences" description="How timers and new activities behave.">
            <div className="space-y-5">
              {savePreference.error ? (
                <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                  {savePreference.error.message}
                </p>
              ) : null}
              <Toggle
                checked={user.preferences.overlapEnabled}
                onChange={(v) => savePreference.mutate({ overlapEnabled: v })}
                label="Allow overlapping timers"
                description="Starting a new timer won't auto-stop the current one."
              />
              <Field label="Default privacy">
                <Select
                  value={user.preferences.defaultPrivacy}
                  onChange={(e) =>
                    savePreference.mutate({ defaultPrivacy: e.target.value as Privacy })
                  }
                  className="max-w-xs"
                >
                  <option value="PUBLIC">Public — partner can see it</option>
                  <option value="PRIVATE">Private — only you can see it</option>
                </Select>
              </Field>
            </div>
          </Section>

          <Section icon={<Bell className="h-4 w-4" />} title="Notifications" description="Choose what CurrentState tells you.">
            <div className="space-y-5">
              <Toggle
                checked={user.preferences.notifications.activityChanges}
                onChange={(v) => savePreference.mutate({ notifications: { ...user.preferences.notifications, activityChanges: v } })}
                label="Partner activity changes"
                description="Notify me when my partner starts, stops, or switches activities."
              />
              <Toggle
                checked={user.preferences.notifications.inApp}
                onChange={(v) => savePreference.mutate({ notifications: { ...user.preferences.notifications, inApp: v } })}
                label="In-app notifications"
                description="Show notifications in the bell."
              />
              <Toggle
                checked={user.preferences.notifications.browserPush}
                onChange={(v) => savePreference.mutate({ notifications: { ...user.preferences.notifications, browserPush: v } })}
                label="Browser push"
                description="Send browser notifications even when the tab is in the background."
              />
            </div>
          </Section>
        </div>

        <div className="min-w-0 space-y-5 lg:col-span-2">
          <Section icon={<Shield className="h-4 w-4" />} title="Account" description="Your identity and connection.">
            <div className="space-y-3">
              <AccountRow icon={<Mail className="h-4 w-4" />} label="Email" value={user.email} />
              <AccountRow icon={<UserRound className="h-4 w-4" />} label="Google ID" value={user.googleId} />
              <AccountRow icon={<Shield className="h-4 w-4" />} label="User ID" value={user.id} />
              <AccountRow
                icon={<SlidersHorizontal className="h-4 w-4" />}
                label="Member since"
                value={formatDayLabel(new Date(user.createdAt))}
              />
            </div>
            <div className="mt-5">
              <Button variant="outline" onClick={() => signOut().then(() => router.replace('/'))} className="w-full">
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </div>
          </Section>

          <Section
            icon={<Sun className="h-4 w-4" />}
            title="Appearance"
            description="Theme for the app interface."
          >
            <Toggle
              checked={theme === 'light'}
              onChange={toggleTheme}
              label="Light mode"
              description="Switch between the dark and light interface."
            />
          </Section>

          <Section
            icon={<AlertTriangle className="h-4 w-4" />}
            title="Danger zone"
            description="Deletes all your data. This can't be undone."
            className="border-rose-500/25"
          >
            <p className="text-sm text-slate-400">
              This permanently removes your categories, tags, activities, schedules, and
              notifications from the database. The app starts empty — data only appears
              once you add it.
            </p>
            <Button
              variant="danger"
              className="mt-4 w-full"
              onClick={() => clearAllData.mutate()}
              loading={clearAllData.isPending}
            >
              <RefreshCw className="h-4 w-4" /> Delete all my data
            </Button>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  description,
  children,
  className,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-line bg-ink-panel/80 p-5 shadow-card',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function AccountRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-ink-elevated/50 px-3.5 py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-500/10 text-slate-400">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
        <p className="truncate text-sm font-medium text-slate-200">{value}</p>
      </div>
    </div>
  );
}
