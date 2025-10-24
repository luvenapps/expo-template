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
  autoStart = true,
}: {
  push: Parameters<typeof createSyncEngine>[0]['push'];
  pull?: Parameters<typeof createSyncEngine>[0]['pull'];
  batchSize?: number;
  enabled?: boolean;
  intervalMs?: number;
  autoStart?: boolean;
}) {
  const engine = useMemo(
    () => createSyncEngine({ push, pull, batchSize }),
    [push, pull, batchSize],
  );

  const { triggerSync } = useSyncManager({ engine, enabled, intervalMs, autoStart });

  const { status, queueSize, lastSyncedAt, lastError } = useSyncStore();

  return {
    status,
    queueSize,
    lastSyncedAt,
    lastError,
    triggerSync,
  };
}
