'use client';

import { CloudOff, RefreshCw } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { usePendingSyncCount } from '@/hooks/use-pending-sync';

export function OfflineBanner() {
  const online = useOnlineStatus();
  const pending = usePendingSyncCount();

  if (online && pending === 0) return null;

  return (
    <div className="flex items-center justify-center gap-2 border-b border-line bg-amber-500/10 px-4 py-1.5 text-xs text-amber-300">
      {online ? (
        <>
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          Syncing {pending} change{pending === 1 ? '' : 's'}…
        </>
      ) : (
        <>
          <CloudOff className="h-3.5 w-3.5" />
          Offline — you can keep using the app. Changes will sync when you&apos;re back online.
        </>
      )}
    </div>
  );
}
