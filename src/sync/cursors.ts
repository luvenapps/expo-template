import { Platform } from 'react-native';
import { DOMAIN } from '@/config/domain.config';

type StorageAdapter = {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
  clearAll(): void;
};

const memory = new Map<string, string>();

function createMemoryAdapter(): StorageAdapter {
  return {
    getString: (key) => memory.get(key),
    set: (key, value) => {
      memory.set(key, value);
    },
    delete: (key) => {
      memory.delete(key);
    },
    clearAll: () => {
      memory.clear();
    },
  };
}

function createMmkvAdapter(): StorageAdapter | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createMMKV } = require('react-native-mmkv');
    if (Platform.OS === 'web') {
      return undefined;
    }

    const instance = createMMKV({ id: DOMAIN.app.cursorStorageId });

    return {
      getString: (key) => instance.getString(key) ?? undefined,
      set: (key, value) => {
        instance.set(key, value);
      },
      delete: (key) => {
        instance.delete(key);
      },
      clearAll: () => {
        instance.clearAll();
      },
    };
  } catch {
    return undefined;
  }
}

const adapter: StorageAdapter = createMmkvAdapter() ?? createMemoryAdapter();

export function getCursor(key: string) {
  return adapter.getString(key) ?? null;
}

export function setCursor(key: string, value: string) {
  adapter.set(key, value);
}

export function clearCursor(key: string) {
  adapter.delete(key);
}

export function resetCursors() {
  adapter.clearAll();
}
