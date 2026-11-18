import { create } from 'zustand';

export type SyncStatus = 'idle' | 'syncing' | 'error';

export type SyncState = {
  status: SyncStatus;
  queueSize: number;
  lastSyncedAt: string | null;
  lastError: string | null;
  setStatus: (status: SyncStatus) => void;
  setQueueSize: (size: number) => void;
  recordSuccess: () => void;
  recordError: (error: string) => void;
  resetError: () => void;
};

const initialState = {
  status: 'idle' as SyncStatus,
  queueSize: 0,
  lastSyncedAt: null,
  lastError: null,
};

export const useSyncStore = create<SyncState>((set) => ({
  ...initialState,
  setStatus: (status) => set({ status }),
  setQueueSize: (queueSize) => set({ queueSize }),
  recordSuccess: () =>
    set({ status: 'idle', lastError: null, lastSyncedAt: new Date().toISOString() }),
  recordError: (error) => set({ status: 'error', lastError: error }),
  resetError: () => set({ lastError: null }),
}));

export const resetSyncStore = () => {
  useSyncStore.setState(initialState);
};
