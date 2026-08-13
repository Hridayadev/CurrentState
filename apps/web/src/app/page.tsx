import {
  BellRing,
  Clock3,
  LineChart,
  Lock,
  Timer,
  UserPlus,
} from 'lucide-react';
import { PRODUCTIVITY_CLASSIFICATIONS } from '@currentstate/shared';
import { SignInButton } from '@/features/auth/sign-in-button';
import { ThemeToggle } from '@/components/common/theme-toggle';
import { BrandLogo } from '@/components/common/brand-logo';
import { CLASSIFICATION_META } from '@/lib/classification';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-0 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6">
        <header className="flex items-center justify-between py-6">
          <BrandLogo className="h-10" />
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-6 text-sm text-slate-400 md:flex">
              <a href="#product" className="hover:text-white">Product</a>
              <a href="#how" className="hover:text-white">How it works</a>
              <a href="#privacy" className="hover:text-white">Privacy</a>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <section className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-ink-panel/80 px-3.5 py-1.5 text-xs text-slate-300">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-emerald-400" />
            Focus together · Grow together
          </div>

          <h1 className="mt-6 max-w-3xl text-balance text-5xl font-bold leading-[1.05] tracking-tight text-white md:text-6xl">
            Focus together.
            <span className="block bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-300 bg-clip-text text-transparent">
              Grow together.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
            CurrentState is a partner-oriented productivity tracker built on one simple
            idea: when you focus together, you grow together. Track activities with timers
            or manual entries, keep a private lifelong history, and let your partner see
            your current state in real time — without ever owning your data.
          </p>

          <div className="mt-8">
            <SignInButton />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Google OAuth · No password required · Your data is stored securely in the cloud
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            {PRODUCTIVITY_CLASSIFICATIONS.map((c) => {
              const meta = CLASSIFICATION_META[c as keyof typeof CLASSIFICATION_META];
              return (
                <span
                  key={c}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${meta.bg} ${meta.text} ${meta.border}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                  {meta.label}
                </span>
              );
            })}
          </div>
        </section>

        <section id="product" className="grid gap-4 py-12 md:grid-cols-3">
          {[
            {
              icon: Timer,
              title: 'Reliable timers',
              body: 'Server-authoritative stopwatches and fixed-duration timers that survive browser disconnects.',
            },
            {
              icon: UserPlus,
              title: 'Two-person rooms',
              body: 'Connect with exactly one partner. See their current activity stream live without polling.',
            },
            {
              icon: LineChart,
              title: 'Honest analytics',
              body: 'Daily and weekly breakdowns by your own classification — never auto-inferred from titles.',
            },
            {
              icon: Lock,
              title: 'You own your history',
              body: 'Records belong to you, not the room. Leave a room and your history stays with you.',
            },
            {
              icon: Clock3,
              title: 'Schedules are plans',
              body: 'Scheduled activities never auto-start. No Info means no info — never failure.',
            },
            {
              icon: BellRing,
              title: 'Partner notifications',
              body: 'In-app and push notifications when your partner starts, stops, or switches.',
            },
          ].map((f) => (
            <article
              key={f.title}
              className="rounded-2xl border border-line bg-ink-panel/70 p-6 shadow-card transition-colors hover:border-current/30"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-white">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{f.body}</p>
            </article>
          ))}
        </section>

        <section id="how" className="border-t border-line py-12">
          <div className="grid gap-8 md:grid-cols-[1fr_1.2fr] md:items-center">
            <div>
              <h2 className="text-2xl font-semibold text-white">Your day, as it happens</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                The dashboard surfaces your current activity with a live timer, today&apos;s
                productivity balance, your partner&apos;s current state, and a full timeline of the day.
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-ink-panel/80 p-5 shadow-card">
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-line bg-ink-elevated/70 p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📚</span>
                    <div>
                      <p className="text-sm font-medium text-white">Programming</p>
                      <p className="text-xs text-slate-500">Started 09:12 · Deep work</p>
                    </div>
                  </div>
                  <span className="font-mono text-lg font-semibold text-cyan-300">01:24:32</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-line bg-ink-elevated/70 p-3">
                    <p className="text-xs text-slate-500">Productive</p>
                    <p className="mt-1 text-lg font-semibold text-emerald-300">4h 20m</p>
                  </div>
                  <div className="rounded-xl border border-line bg-ink-elevated/70 p-3">
                    <p className="text-xs text-slate-500">No activity</p>
                    <p className="mt-1 text-lg font-semibold text-slate-300">2h 10m</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-emerald-400/25 bg-emerald-400/5 p-3">
                  <span className="relative flex">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700/60 text-sm">🦊</span>
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-ink-panel bg-emerald-400" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white">Alex is working</p>
                    <p className="text-xs text-slate-500">💼 Design review · for 31m</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="privacy" className="border-t border-line py-12 text-center">
          <h2 className="text-2xl font-semibold text-white">Data belongs to you</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
            Rooms are sharing relationships, not data owners. Your categories, activities,
            tags, schedules, and analytics survive room changes. Historical records are
            immutable, and private activities are never shown to your partner.
          </p>
        </section>

        <footer className="border-t border-line py-8 text-center text-xs text-slate-500">
          <p>CurrentState — focus together, grow together.</p>
          <div className="mt-3 flex items-center justify-center gap-4">
            <Link href="/privacy" className="hover:text-slate-300">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-300">Terms</Link>
          </div>
          <p className="mt-6">
            Made with <span className="text-rose-400">♥</span> by{' '}
            <a
              href="https://hridayadev.com.np"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-slate-400 transition-colors hover:text-cyan-300"
            >
              Hridaya
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
