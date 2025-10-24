import { useMemo } from 'react';
import { createSyncEngine } from './engine';
import { useSyncStore } from '@/state';
import { useSyncManager } from './useSyncManager';

export function useSync({
  push,
  pull,
  batchSize,
  enabled = true,
  intervalMs,
}: {
  push: Parameters<typeof createSyncEngine>[0]['push'];
  pull?: Parameters<typeof createSyncEngine>[0]['pull'];
  batchSize?: number;
  enabled?: boolean;
  intervalMs?: number;
}) {
  const engine = useMemo(
    () => createSyncEngine({ push, pull, batchSize }),
    [push, pull, batchSize],
  );

  const { triggerSync } = useSyncManager({ engine, enabled, intervalMs });

  const { status, queueSize, lastSyncedAt, lastError } = useSyncStore();

  return {
    status,
    queueSize,
    lastSyncedAt,
    lastError,
    triggerSync,
  };
}
