'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/common/brand-logo';
import { Field, Input, Select } from '@/components/ui/input';
import { useAuth } from '@/features/auth/auth-provider';
import { EMOJI_AVATARS, cn } from '@/lib/utils';
import { useHydrated } from '@/hooks/use-hydrated';

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

export default function WelcomePage() {
  const { user, loading, completeOnboarding } = useAuth();
  const router = useRouter();
  const hydrated = useHydrated();
  const [displayName, setDisplayName] = useState('');
  const [avatar, setAvatar] = useState('🚀');
  const [timezone, setTimezone] = useState('Asia/Kathmandu');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated || loading) return;
    if (!user) router.replace('/');
    else if (user.onboarded) router.replace('/dashboard');
  }, [hydrated, loading, user, router]);

  if (!hydrated || loading || !user || user.onboarded) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await completeOnboarding({
        displayName: displayName.trim(),
        emojiAvatar: avatar,
        timezone,
      });
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong saving your profile.');
      setBusy(false);
    }
  };

  const handleSkip = async () => {
    setBusy(true);
    setError(null);
    try {
      await completeOnboarding({ displayName: user.displayName, emojiAvatar: user.emojiAvatar, timezone: user.timezone });
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong saving your profile.');
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <BrandLogo className="mx-auto h-12" />
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-white">Make it yours</h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Your profile is separate from your Google account — change it anytime.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-line bg-ink-panel/90 p-6 shadow-card"
        >
          <div className="mb-6 flex justify-center">
            <span className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-current/30 bg-gradient-to-b from-slate-700/50 to-slate-800/60 text-5xl transition-transform">
              {avatar || '🙂'}
            </span>
          </div>

          <div className="mb-6">
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

          <Field label="Display name" className="mb-4">
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={user.displayName || 'How should your partner see you?'}
              maxLength={40}
              autoFocus
            />
          </Field>

          <Field label="Timezone" hint="Used for your day, week, and analytics boundaries." className="mb-6">
            <Select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </Select>
          </Field>

          {error && (
            <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" className="flex-1" size="lg" disabled={!displayName.trim()} loading={busy}>
              Get started <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <button
            type="button"
            onClick={handleSkip}
            disabled={busy}
            className="mt-3 w-full text-center text-xs text-slate-500 hover:text-slate-300"
          >
            Skip for now — I&apos;ll customize later
          </button>
        </form>
      </div>
    </main>
  );
}
