import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import type { createSyncEngine } from './engine';

type SyncEngine = ReturnType<typeof createSyncEngine>;

type UseSyncManagerOptions = {
  engine: SyncEngine;
  intervalMs?: number;
  enabled?: boolean;
  autoStart?: boolean;
};

const DEFAULT_INTERVAL = 60000;

export function useSyncManager({
  engine,
  intervalMs = DEFAULT_INTERVAL,
  enabled = true,
  autoStart = true,
}: UseSyncManagerOptions) {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let cancelled = false;

    const run = async () => {
      if (cancelled) return;
      await engine.runSync();
    };

    if (autoStart) {
      run().catch(() => undefined);
    }

    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') {
        run().catch(() => undefined);
      }
    };

    let subscription: { remove?: () => void } | undefined;

    if (typeof AppState.addEventListener === 'function') {
      subscription = AppState.addEventListener('change', handleAppStateChange);
    } else {
      // Legacy React Native support
      (
        AppState as unknown as {
          addEventListener?: (type: string, handler: (state: AppStateStatus) => void) => void;
        }
      ).addEventListener?.('change', handleAppStateChange);
    }

    const interval = setInterval(() => {
      run().catch(() => undefined);
    }, intervalMs);

    return () => {
      cancelled = true;
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      }
      clearInterval(interval);
    };
  }, [engine, intervalMs, enabled, autoStart]);

  const triggerSync = async () => {
    if (!enabled) return;
    await engine.runSync();
  };

  return { triggerSync };
}
