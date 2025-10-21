import type { OutboxRecord } from './outbox';
import { getPending, markProcessed, incrementAttempt } from './outbox';
import { useSyncStore } from '@/state';

type PushFn = (records: OutboxRecord[]) => Promise<void>;
type PullFn = () => Promise<void>;

type SyncEngineOptions = {
  push: PushFn;
  pull?: PullFn;
  batchSize?: number;
};

const DEFAULT_BATCH_SIZE = 50;

export function createSyncEngine({
  push,
  pull,
  batchSize = DEFAULT_BATCH_SIZE,
}: SyncEngineOptions) {
  const store = useSyncStore;

  const processOutbox = async () => {
    store.getState().setStatus('syncing');

    const pending = await getPending(batchSize);
    store.getState().setQueueSize(pending.length);

    if (!pending.length) {
      store.getState().setStatus('idle');
      return;
    }

    try {
      await push(pending);
      await markProcessed(pending.map((record) => record.id));
      store.getState().recordSuccess();
    } catch (error) {
      await Promise.all(pending.map((record) => incrementAttempt(record.id)));
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
