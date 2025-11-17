import { DOMAIN } from '@/config/domain.config';
import { Platform } from 'react-native';
import { useSyncExternalStore } from 'react';

export type BroadcastMessage = {
  id: string;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  publishedAt: string;
  expiresAt?: string;
};

type BroadcastState = {
  message: BroadcastMessage | null;
  dismissed: Record<string, string>;
};

const STORAGE_KEY = `${DOMAIN.app.storageKey}-broadcast-message`;
const STORAGE_NAMESPACE = `${DOMAIN.app.cursorStorageId}-broadcast`;

const listeners = new Set<() => void>();
let state: BroadcastState = loadState();

function createStorage(): {
  get(): string | null;
  set(value: string): void;
  remove(): void;
} {
  if (Platform.OS === 'web') {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
      return {
        get: () => {
          try {
            return globalThis.localStorage.getItem(STORAGE_KEY);
          } catch {
            return null;
          }
        },
        set: (value) => {
          try {
            globalThis.localStorage.setItem(STORAGE_KEY, value);
          } catch {
            /* noop */
          }
        },
        remove: () => {
          try {
            globalThis.localStorage.removeItem(STORAGE_KEY);
          } catch {
            /* noop */
          }
        },
      };
    }
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MMKV } = require('react-native-mmkv');
    const store = new MMKV({ id: STORAGE_NAMESPACE });
    return {
      get: () => store.getString(STORAGE_KEY) ?? null,
      set: (value) => {
        store.set(STORAGE_KEY, value);
      },
      remove: () => {
        store.delete(STORAGE_KEY);
      },
    };
  } catch {
    let memory: string | null = null;
    return {
      get: () => memory,
      set: (value) => {
        memory = value;
      },
      remove: () => {
        memory = null;
      },
    };
  }
}

const storage = createStorage();

function loadState(): BroadcastState {
  try {
    const raw = storage.get();
    if (!raw) return { message: null, dismissed: {} };
    return JSON.parse(raw) as BroadcastState;
  } catch {
    return { message: null, dismissed: {} };
  }
}

function persistState(next: BroadcastState) {
  try {
    storage.set(JSON.stringify(next));
  } catch {
    /* noop */
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

function setState(partial: Partial<BroadcastState>) {
  state = { ...state, ...partial };
  persistState(state);
  emit();
}

export function setBroadcastMessage(message: BroadcastMessage | null) {
  if (message) {
    const dismissed = { ...state.dismissed };
    delete dismissed[message.id];
    setState({ message, dismissed });
  } else {
    setState({ message: null });
  }
}

export function dismissBroadcastMessage(messageId: string) {
  setState({ dismissed: { ...state.dismissed, [messageId]: new Date().toISOString() } });
}

export function clearBroadcastMessage() {
  setState({ message: null });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot() {
  return state;
}

export function useBroadcastState() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export function useActiveBroadcastMessage() {
  const current = useBroadcastState();
  const message = current.message;
  if (!message) {
    return { message: null as BroadcastMessage | null };
  }
  if (current.dismissed[message.id]) {
    return { message: null as BroadcastMessage | null };
  }
  return { message };
}
