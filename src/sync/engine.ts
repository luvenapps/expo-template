import { SYNC } from '@/config/constants';
import type { OutboxRecord } from './outbox';
import { getPending, incrementAttempt, markProcessed } from './outbox';
import { useSyncStore } from '@/state';

type PushFn = (records: OutboxRecord[]) => Promise<void>;
type PullFn = () => Promise<void>;

type SyncEngineOptions = {
  push: PushFn;
  pull?: PullFn;
  batchSize?: number;
};

export function createSyncEngine({
  push,
  pull,
  batchSize = SYNC.defaultBatchSize,
}: SyncEngineOptions) {
  const store = useSyncStore;

  const processOutbox = async () => {
    store.getState().setStatus('syncing');

    let pending: OutboxRecord[] = [];

    try {
      pending = await getPending(batchSize);
      store.getState().setQueueSize(pending.length);

      if (!pending.length) {
        store.getState().recordSuccess();
        return;
      }

      await push(pending);
      await markProcessed(pending.map((record: OutboxRecord) => record.id));
      store.getState().setQueueSize(0);
      store.getState().recordSuccess();
    } catch (error) {
      if (pending.length) {
        await Promise.all(pending.map((record: OutboxRecord) => incrementAttempt(record.id)));
      }

      store.getState().recordError(error instanceof Error ? error.message : String(error));

      throw error;
    }
  };

  const runSync = async () => {
    await processOutbox();
    if (pull) {
      await pull();
      store.getState().recordSuccess();
    }
  };

  return {
    processOutbox,
    runSync,
  };
}
