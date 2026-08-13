import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandLogo } from '@/components/common/brand-logo';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How CurrentState collects, uses, and protects your data. Your activity history belongs to you.',
};

export default function PrivacyPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-0 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
      </div>
      <div className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-12">
        <BrandLogo className="h-10" />
        <h1 className="mt-8 text-3xl font-bold tracking-tight text-white">Privacy Policy</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: 2026</p>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-slate-400">
          <p>
            CurrentState collects only the information needed to run the app: your Google account
            name, email, and avatar for sign-in, plus the activity records you create.
          </p>
          <p>
            Your activity history belongs to you. Rooms are sharing relationships, not data owners —
            your categories, activities, tags, schedules, and analytics survive room changes, and
            private activities are never shown to your partner.
          </p>
          <p>
            Records are stored securely in the cloud and can be deleted by you at any time.
            We never sell your data and never use it for advertising.
          </p>
        </div>
        <Link href="/" className="mt-8 text-sm text-cyan-300 hover:underline">
          ← Back to CurrentState
        </Link>
      </div>
    </main>
  );
}
