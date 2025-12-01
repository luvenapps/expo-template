import { DOMAIN } from '@/config/domain.config';
import { Platform } from 'react-native';

export type NotificationPreferences = {
  remindersEnabled: boolean;
  dailySummaryEnabled: boolean;
  quietHours: [number, number];
  pushOptInStatus: 'unknown' | 'enabled' | 'denied' | 'unavailable';
  pushPromptAttempts: number;
  pushLastPromptAt: number; // epoch ms
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  remindersEnabled: false,
  dailySummaryEnabled: false,
  quietHours: [0, 0],
  pushOptInStatus: 'unknown',
  pushPromptAttempts: 0,
  pushLastPromptAt: 0,
};

const STORAGE_KEY = `${DOMAIN.app.storageKey}-notification-preferences`;
const STORAGE_NAMESPACE = `${DOMAIN.app.cursorStorageId}-notifications`;

function getNativeStore() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MMKV } = require('react-native-mmkv');
    return new MMKV({ id: STORAGE_NAMESPACE });
  } catch {
    return null;
  }
}

export function loadNotificationPreferences(): NotificationPreferences {
  try {
    const raw =
      Platform.OS === 'web'
        ? typeof globalThis !== 'undefined' && 'localStorage' in globalThis
          ? globalThis.localStorage.getItem(STORAGE_KEY)
          : null
        : (getNativeStore()?.getString(STORAGE_KEY) ?? null);

    if (!raw) {
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }

    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    if (!parsed.quietHours || parsed.quietHours.length !== 2) {
      parsed.quietHours = DEFAULT_NOTIFICATION_PREFERENCES.quietHours;
    }

    const normalized = {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...parsed,
      quietHours: parsed.quietHours as [number, number],
    };

    if (typeof normalized.pushPromptAttempts !== 'number') {
      normalized.pushPromptAttempts = DEFAULT_NOTIFICATION_PREFERENCES.pushPromptAttempts;
    }
    if (typeof normalized.pushLastPromptAt !== 'number') {
      normalized.pushLastPromptAt = DEFAULT_NOTIFICATION_PREFERENCES.pushLastPromptAt;
    }
    if (!normalized.pushOptInStatus) {
      normalized.pushOptInStatus = DEFAULT_NOTIFICATION_PREFERENCES.pushOptInStatus;
    }

    return normalized;
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export function persistNotificationPreferences(preferences: NotificationPreferences) {
  const payload = JSON.stringify(preferences);

  if (Platform.OS === 'web') {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
      globalThis.localStorage.setItem(STORAGE_KEY, payload);
    }
    return;
  }

  const store = getNativeStore();
  store?.set(STORAGE_KEY, payload);
}
