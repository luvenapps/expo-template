import { useMemo } from 'react';
import { createSyncEngine } from './engine';
import { useSyncStore } from '@/state';
import { useSyncTask } from './useSyncTask';

export function useSync({
  push,
  pull,
  batchSize,
  enabled = true,
  intervalMs,
  autoStart = true,
  backgroundInterval,
}: {
  push: Parameters<typeof createSyncEngine>[0]['push'];
  pull?: Parameters<typeof createSyncEngine>[0]['pull'];
  batchSize?: number;
  enabled?: boolean;
  intervalMs?: number;
  autoStart?: boolean;
  backgroundInterval?: number;
}) {
  const engine = useMemo(
    () => createSyncEngine({ push, pull, batchSize }),
    [push, pull, batchSize],
  );

  const { triggerSync } = useSyncTask({
    engine,
    enabled,
    intervalMs,
    autoStart,
    backgroundInterval,
  });

  const { status, queueSize, lastSyncedAt, lastError } = useSyncStore();

  return {
    status,
    queueSize,
    lastSyncedAt,
    lastError,
    triggerSync,
  };
}
