'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  CalendarDays,
  FolderOpen,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Play,
  Settings,
  Tags,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import * as api from '@/lib/api';
import { cn, formatDayLabel } from '@/lib/utils';
import { useAuth } from '@/features/auth/auth-provider';
import { useHydrated } from '@/hooks/use-hydrated';
import { Avatar } from '@/components/ui/avatar';
import { BrandLogo } from '@/components/common/brand-logo';
import { NotificationToaster } from '@/components/common/notification-toaster';
import { NotificationsBell } from '@/components/common/notifications';
import { ThemeToggle } from '@/components/common/theme-toggle';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/activities', label: 'Activities', icon: Play },
  { href: '/schedule', label: 'Schedule', icon: CalendarDays },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/history', label: 'History', icon: History },
  { href: '/room', label: 'Room', icon: Users },
  { href: '/categories', label: 'Categories', icon: FolderOpen },
  { href: '/tags', label: 'Tags', icon: Tags },
];

function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center px-2 py-1">
      <BrandLogo className="h-8" />
    </Link>
  );
}

function PartnerChip() {
  const { data: partner } = useQuery({
    queryKey: ['partner'],
    queryFn: api.getPartnerPresence,
    refetchInterval: 15_000,
  });

  if (!partner) return null;
  return (
    <Link
      href="/room"
      className="hidden items-center gap-2 rounded-xl border border-line bg-ink-elevated/70 px-3 py-2 transition-colors hover:border-current/40 md:flex"
      title={`${partner.displayName} — ${partner.activity?.title ?? 'Idle'}`}
    >
      <span className="relative flex">
        <Avatar emoji={partner.emojiAvatar} size="xs" />
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-ink-panel bg-emerald-400" />
      </span>
      <span className="text-xs text-slate-300">
        <span className="font-medium text-slate-200">{partner.displayName}</span>
        <span className="text-slate-500"> · </span>
        {partner.activity ? (
          <span className="text-cyan-300">{partner.activity.categoryIcon} {partner.activity.title}</span>
        ) : (
          <span className="text-slate-500">idle</span>
        )}
      </span>
    </Link>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-cyan-400/12 text-cyan-200 shadow-[0_1px_0_rgba(125,211,252,0.2)_inset]'
                : 'text-slate-400 hover:bg-overlay hover:text-slate-100',
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const hydrated = useHydrated();
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (loading) return;
    if (!user) {
      router.replace('/');
      return;
    }
    if (!user.onboarded) {
      router.replace('/welcome');
    }
  }, [hydrated, loading, user, router]);

  if (!hydrated || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
          Loading CurrentState…
        </div>
      </div>
    );
  }

  if (!user) return null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-ink-panel/60 px-3 py-5 lg:flex">
        <Logo />
        <div className="mt-6 flex-1">
          <NavList />
        </div>
        <div className="border-t border-line pt-3">
          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              className="flex flex-1 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-overlay hover:text-slate-100"
            >
              <Settings className="h-4 w-4" /> Settings
            </Link>
            <ThemeToggle />
          </div>
          <button
            onClick={async () => {
              await signOut();
              router.replace('/');
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-overlay hover:text-rose-300"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
          <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-line bg-ink-elevated/60 p-3">
            <Avatar emoji={user.emojiAvatar} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-100">{user.displayName}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-ink/90 px-4 backdrop-blur lg:hidden">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileNav(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-slate-300"
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </div>

      {mobileNav ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/70" onClick={() => setMobileNav(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-line bg-ink-panel px-3 py-5">
            <div className="flex items-center justify-between">
              <Logo />
              <button
                onClick={() => setMobileNav(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-overlay"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6 flex-1">
              <NavList onNavigate={() => setMobileNav(false)} />
            </div>
            <Link
              href="/settings"
              onClick={() => setMobileNav(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-400 hover:bg-overlay"
            >
              <Settings className="h-4 w-4" /> Settings
            </Link>
            <button
              onClick={async () => {
                await signOut();
                router.replace('/');
              }}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-400 hover:bg-overlay hover:text-rose-300"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </aside>
        </div>
      ) : null}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-3 border-b border-line bg-ink/70 px-5 backdrop-blur lg:top-0 lg:px-8">
          <div className="hidden items-center gap-3 lg:flex">
            <p className="text-sm text-slate-300">
              <span className="font-medium text-white">{greeting}</span>
              <span className="text-slate-500"> · </span>
              {formatDayLabel(new Date())}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <PartnerChip />
            <NotificationsBell />
            <Link href="/settings" aria-label="Profile">
              <Avatar emoji={user.emojiAvatar} size="sm" className="cursor-pointer border-current/30" />
            </Link>
          </div>
        </header>
        <main className="flex-1 px-5 py-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
      <NotificationToaster />
    </div>
  );
}
