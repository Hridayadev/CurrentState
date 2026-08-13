'use client';

import { useEffect, useState } from 'react';
import { getQueue, onQueueChange } from '@/lib/offline/storage';

export function usePendingSyncCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let alive = true;
    const refresh = () => {
      getQueue().then((q) => {
        if (alive) setCount(q.length);
      });
    };
    refresh();
    const unsubscribe = onQueueChange(refresh);
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  return count;
}
