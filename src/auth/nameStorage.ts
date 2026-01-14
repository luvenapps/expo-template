import { Platform } from 'react-native';
import { DOMAIN } from '@/config/domain.config';

const STORAGE_KEY = `${DOMAIN.app.storageKey}-local-name`;
const STORAGE_NAMESPACE = `${DOMAIN.app.storageKey}-profile`;

function getNativeStore() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MMKV } = require('react-native-mmkv');
    return new MMKV({ id: STORAGE_NAMESPACE });
  } catch {
    return null;
  }
}

export function getLocalName(): string | null {
  try {
    if (Platform.OS === 'web') {
      if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
        return globalThis.localStorage.getItem(STORAGE_KEY);
      }
      return null;
    }

    const store = getNativeStore();
    return store?.getString(STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

export function setLocalName(value: string) {
  try {
    const trimmed = value.trim();
    if (!trimmed) {
      clearLocalName();
      return;
    }

    if (Platform.OS === 'web') {
      if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
        globalThis.localStorage.setItem(STORAGE_KEY, trimmed);
      }
      return;
    }

    const store = getNativeStore();
    store?.set(STORAGE_KEY, trimmed);
  } catch {
    // Silently fail if storage is unavailable
  }
}

export function clearLocalName() {
  try {
    if (Platform.OS === 'web') {
      if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
        globalThis.localStorage.removeItem(STORAGE_KEY);
      }
      return;
    }

    const store = getNativeStore();
    store?.delete(STORAGE_KEY);
  } catch {
    // Silently fail if storage is unavailable
  }
}
