import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import type { createSyncEngine } from './engine';
import { DOMAIN } from '@/config/domain.config';
import { SYNC } from '@/config/constants';
import { createLogger } from '@/observability/logger';

type SyncEngine = ReturnType<typeof createSyncEngine>;

const BACKGROUND_TASK_NAME = DOMAIN.app.syncTask;
const backgroundTaskHandlers = new Map<string, () => Promise<void>>();
const logger = createLogger('Sync');

type UseSyncTaskOptions = {
  engine: SyncEngine;
  intervalMs?: number;
  enabled?: boolean;
  autoStart?: boolean;
  backgroundInterval?: number;
};

export function useSyncTask({
  engine,
  intervalMs = SYNC.defaultIntervalMs,
  enabled = true,
  autoStart = true,
  backgroundInterval = SYNC.defaultFetchIntervalSec,
}: UseSyncTaskOptions) {
  const mountedRef = useRef(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateListenerRef = useRef<{ remove?: () => void } | null>(null);
  const isRunningRef = useRef(false);
  const queuedRef = useRef(false);
  const queuedForceRef = useRef(false);
  const queuedResolverRef = useRef<{
    resolve: () => void;
    reject: (error: unknown) => void;
  } | null>(null);
  const queuedPromiseRef = useRef<Promise<void> | null>(null);
  const failureCountRef = useRef(0);
  const cooldownUntilRef = useRef<number | null>(null);
  const hasWarnedWebRef = useRef(false);

  const runSync = useCallback(
    async function runSyncInternal(force = false): Promise<void> {
      if (!mountedRef.current) {
        return;
      }

      if (Platform.OS === 'web') {
        if (!hasWarnedWebRef.current) {
          logger.warn(
            'Sync is not supported on web platform. Database operations require native SQLite.',
          );
          hasWarnedWebRef.current = true;
        }
        return;
      }

      const now = Date.now();
      if (!force && cooldownUntilRef.current !== null && now < cooldownUntilRef.current) {
        const remaining = cooldownUntilRef.current - now;
        logger.warn(`Skipping scheduled run - retrying in ${Math.ceil(remaining / 1000)}s.`);
        return;
      }

      if (isRunningRef.current) {
        if (queuedRef.current) {
          queuedForceRef.current = queuedForceRef.current || force;
          return queuedPromiseRef.current ?? Promise.resolve();
        }

        queuedRef.current = true;
        queuedForceRef.current = force;
        queuedPromiseRef.current = new Promise<void>((resolve, reject) => {
          queuedResolverRef.current = { resolve, reject };
        });
        return queuedPromiseRef.current;
      }

      isRunningRef.current = true;
      try {
        await engine.runSync();
        failureCountRef.current = 0;
        cooldownUntilRef.current = null;
      } catch (error) {
        failureCountRef.current += 1;
        const backoff = Math.min(
          SYNC.maxBackoffMs,
          SYNC.baseBackoffMs * 2 ** (failureCountRef.current - 1),
        );
        cooldownUntilRef.current = Date.now() + backoff;
        throw error;
      } finally {
        isRunningRef.current = false;
        if (queuedRef.current) {
          const shouldForce = queuedForceRef.current;
          const queuedResolver = queuedResolverRef.current;
          queuedRef.current = false;
          queuedForceRef.current = false;
          queuedPromiseRef.current = null;
          queuedResolverRef.current = null;

          queueMicrotask(() => {
            runSyncInternal(shouldForce)
              .then(() => queuedResolver?.resolve())
              .catch((error) => queuedResolver?.reject(error));
          });
        }
      }
    },
    [engine],
  );

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
    if (!enabled || Platform.OS === 'web') {
      if (!enabled) {
        unregisterBackgroundTask().catch(() => undefined);
      }
      return undefined;
    }

    const register = async () => {
      try {
        const status = await BackgroundTask.getStatusAsync();
        if (status !== BackgroundTask.BackgroundTaskStatus.Available) {
          logger.warn('Background tasks are disabled or restricted. Skipping registration.');
          return;
        }

        upsertBackgroundTaskHandler(BACKGROUND_TASK_NAME, () => runSync());

        await BackgroundTask.registerTaskAsync(BACKGROUND_TASK_NAME, {
          minimumInterval: backgroundInterval,
        });
      } catch (error) {
        logger.warn('Failed to register background task:', error);
      }
    };

    register().catch(() => undefined);

    return () => {
      backgroundTaskHandlers.delete(BACKGROUND_TASK_NAME);
      unregisterBackgroundTask().catch(() => undefined);
    };
  }, [enabled, backgroundInterval, runSync]);

  const triggerSync = useCallback(async () => {
    await runSync(true);
  }, [runSync]);

  return { triggerSync };
}

function upsertBackgroundTaskHandler(name: string, handler: () => Promise<void>) {
  backgroundTaskHandlers.set(name, handler);

  if (!TaskManager.isTaskDefined(name)) {
    TaskManager.defineTask(name, async () => {
      const executor = backgroundTaskHandlers.get(name);
      if (!executor) {
        return BackgroundTask.BackgroundTaskResult.Success;
      }
      try {
        await executor();
        return BackgroundTask.BackgroundTaskResult.Success;
      } catch {
        return BackgroundTask.BackgroundTaskResult.Failed;
      }
    });
  }
}

async function unregisterBackgroundTask() {
  if (Platform.OS === 'web') {
    return;
  }

  const status = await BackgroundTask.getStatusAsync();
  if (status === BackgroundTask.BackgroundTaskStatus.Restricted) {
    return;
  }

  try {
    await BackgroundTask.unregisterTaskAsync(BACKGROUND_TASK_NAME);
  } catch {
    // ignore
  } finally {
    backgroundTaskHandlers.delete(BACKGROUND_TASK_NAME);
  }
}
