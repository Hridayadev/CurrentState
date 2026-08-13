export class OfflineError extends Error {
  constructor(message = 'You are offline. Changes will sync when you reconnect.') {
    super(message);
    this.name = 'OfflineError';
  }
}

export function isOffline(): boolean {
  if (typeof navigator === 'undefined') return false;
  return navigator.onLine === false;
}

export function isOnline(): boolean {
  return !isOffline();
}

/** Queue an op only when offline, otherwise this is a no-op. */
export function offlineOnly(): void {
  if (isOffline()) throw new OfflineError();
}
