import type { Session } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { DOMAIN } from '@/config/domain.config';
import { supabase } from './client';
import type { Logger } from '@/observability/logger';

const STORAGE_KEY = `${DOMAIN.app.storageKey}-pending-remote-reset`;
const STORAGE_NAMESPACE = `${DOMAIN.app.storageKey}-reset`;

function getNativeStore() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MMKV } = require('react-native-mmkv');
    return new MMKV({ id: STORAGE_NAMESPACE });
  } catch {
    return null;
  }
}

export function setPendingRemoteReset(value: boolean) {
  if (Platform.OS === 'web') {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
      globalThis.localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
    }
    return;
  }

  const store = getNativeStore();
  store?.set(STORAGE_KEY, value ? '1' : '0');
}

export function getPendingRemoteReset(): boolean {
  try {
    if (Platform.OS === 'web') {
      if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
        return globalThis.localStorage.getItem(STORAGE_KEY) === '1';
      }
      return false;
    }

    const store = getNativeStore();
    return store?.getString(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function clearPendingRemoteReset() {
  if (Platform.OS === 'web') {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
      globalThis.localStorage.removeItem(STORAGE_KEY);
    }
    return;
  }

  const store = getNativeStore();
  store?.delete(STORAGE_KEY);
}

export async function deleteRemoteUserData(userId: string) {
  const remoteTables = [
    DOMAIN.entities.entries.remoteTableName,
    DOMAIN.entities.reminders.remoteTableName,
    DOMAIN.entities.devices.remoteTableName,
    DOMAIN.entities.primary.remoteTableName,
  ];

  for (const table of remoteTables) {
    const { error } = await supabase.from(table).delete().eq('user_id', userId);
    if (error) {
      throw error;
    }
  }
}

export async function runPendingRemoteReset(session: Session | null, logger?: Logger) {
  if (!session?.user?.id) return;
  if (!getPendingRemoteReset()) return;

  try {
    await deleteRemoteUserData(session.user.id);
    clearPendingRemoteReset();
    logger?.info('Pending remote reset completed');
  } catch (error) {
    logger?.error('Pending remote reset failed:', error);
  }
}
