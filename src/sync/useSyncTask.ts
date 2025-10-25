import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { registerTaskAsync, unregisterTaskAsync, isTaskDefined } from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import type { createSyncEngine } from './engine';

type SyncEngine = ReturnType<typeof createSyncEngine>;

const BACKGROUND_TASK_NAME = 'betterhabits-sync-task';
const DEFAULT_INTERVAL = 60000;
const DEFAULT_FETCH_INTERVAL = 15 * 60; // 15 minutes

type UseSyncTaskOptions = {
  engine: SyncEngine;
  intervalMs?: number;
  enabled?: boolean;
  autoStart?: boolean;
  backgroundInterval?: number;
};

export function useSyncTask({
  engine,
  intervalMs = DEFAULT_INTERVAL,
  enabled = true,
  autoStart = true,
  backgroundInterval = DEFAULT_FETCH_INTERVAL,
}: UseSyncTaskOptions) {
  const mountedRef = useRef(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateListenerRef = useRef<{ remove?: () => void } | null>(null);

  const runSync = useCallback(async () => {
    if (!mountedRef.current) return;
    await engine.runSync();
  }, [engine]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (appStateListenerRef.current) {
        appStateListenerRef.current.remove?.();
        appStateListenerRef.current = null;
      }
      return undefined;
    }

    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') {
        runSync().catch(() => undefined);
      }
    };

    if (typeof AppState.addEventListener === 'function') {
      appStateListenerRef.current = AppState.addEventListener('change', handleAppStateChange);
    } else {
      (
        AppState as unknown as {
          addEventListener?: (type: string, handler: (state: AppStateStatus) => void) => void;
        }
      ).addEventListener?.('change', handleAppStateChange);
    }

    intervalRef.current = setInterval(() => {
      runSync().catch(() => undefined);
    }, intervalMs);

    if (autoStart) {
      runSync().catch(() => undefined);
    }

    return () => {
      appStateListenerRef.current?.remove?.();
      appStateListenerRef.current = null;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, intervalMs, runSync, autoStart]);

  useEffect(() => {
    if (!enabled) {
      unregisterBackgroundTask().catch(() => undefined);
      return undefined;
    }

    const register = async () => {
      const defined = isTaskDefined(BACKGROUND_TASK_NAME);
      if (!defined) {
        registerTask(BACKGROUND_TASK_NAME, runSync);
      }

      await BackgroundFetch.registerTaskAsync(BACKGROUND_TASK_NAME, {
        minimumInterval: backgroundInterval,
        stopOnTerminate: false,
        startOnBoot: true,
      });
    };

    register().catch(() => undefined);

    return () => {
      unregisterBackgroundTask().catch(() => undefined);
    };
  }, [enabled, backgroundInterval, runSync]);

  const triggerSync = useCallback(async () => {
    await runSync();
  }, [runSync]);

  return { triggerSync };
}

function registerTask(name: string, runSync: () => Promise<void>) {
  registerTaskAsync(name, async () => {
    try {
      await runSync();
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch {
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  }).catch(() => undefined);
}

async function unregisterBackgroundTask() {
  const registered = await BackgroundFetch.getStatusAsync();
  if (registered === BackgroundFetch.BackgroundFetchStatus.Denied) {
    return;
  }

  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_TASK_NAME);
    await unregisterTaskAsync(BACKGROUND_TASK_NAME);
  } catch {
    // ignore
  }
}
