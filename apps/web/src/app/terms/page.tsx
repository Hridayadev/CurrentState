import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandLogo } from '@/components/common/brand-logo';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'The terms that apply to your use of CurrentState. Use it fairly, own your data, and stay respectful.',
};

export default function TermsPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>
      <div className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-12">
        <BrandLogo className="h-10" />
        <h1 className="mt-8 text-3xl font-bold tracking-tight text-white">Terms of Service</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: 2026</p>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-slate-400">
          <p>
            By using CurrentState you agree to use it as a personal productivity tracker — for your
            own focus, scheduling, and analytics.
          </p>
          <p>
            You are responsible for the content you create and for respecting your partner: don&apos;t
            use the app for unlawful purposes, harassment, or to misuse others&apos; information.
          </p>
          <p>
            Your data is yours. You can delete it anytime. The service is provided as-is, and we may
            update these terms as the app evolves.
          </p>
        </div>
        <Link href="/" className="mt-8 text-sm text-cyan-300 hover:underline">
          ← Back to CurrentState
        </Link>
      </div>
    </main>
  );
}
