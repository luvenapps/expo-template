import { describe, expect, test } from '@jest/globals';
import { resetSyncStore, useSyncStore } from '@/state/syncStore';

describe('useSyncStore', () => {
  test('updates status and queue size', () => {
    resetSyncStore();
    useSyncStore.getState().setStatus('syncing');
    useSyncStore.getState().setQueueSize(5);

    const state = useSyncStore.getState();
    expect(state.status).toBe('syncing');
    expect(state.queueSize).toBe(5);
  });

  test('records success and errors', () => {
    resetSyncStore();
    useSyncStore.getState().recordError('oops');
    let state = useSyncStore.getState();
    expect(state.status).toBe('error');
    expect(state.lastError).toBe('oops');

    useSyncStore.getState().recordSuccess();
    state = useSyncStore.getState();
    expect(state.status).toBe('idle');
    expect(state.lastError).toBeNull();
    expect(state.lastSyncedAt).not.toBeNull();
  });

  test('reset clears error state', () => {
    resetSyncStore();
    useSyncStore.getState().recordError('oops');
    useSyncStore.getState().resetError();

    expect(useSyncStore.getState().lastError).toBeNull();
  });
});
