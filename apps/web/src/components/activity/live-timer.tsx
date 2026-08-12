'use client';

import { useNow } from '@/hooks/use-now';
import { formatTimer } from '@/lib/utils';
import { cn } from '@/lib/utils';

/** Live elapsed timer derived from a server timestamp (never ticked locally). */
export function ElapsedTimer({
  startTime,
  className,
}: {
  startTime: string;
  className?: string;
}) {
  const now = useNow(1000);
  const elapsed = (now - new Date(startTime).getTime()) / 1000;
  return (
    <span className={cn('font-mono tabular-nums', className)}>{formatTimer(elapsed)}</span>
  );
}

/** Live countdown to an expected end time; renders zero once passed. */
export function CountdownTimer({
  expectedEndTime,
  className,
}: {
  expectedEndTime: string;
  className?: string;
}) {
  const now = useNow(1000);
  const remaining = Math.max(0, (new Date(expectedEndTime).getTime() - now) / 1000);
  return (
    <span className={cn('font-mono tabular-nums', className)}>{formatTimer(remaining)}</span>
  );
}
