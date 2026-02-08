import { DOMAIN } from '@/config/domain.config';
import { Platform } from 'react-native';

import { NOTIFICATION_STATUS, type NotificationStatus } from '@/notifications/status';

export type NotificationPreferences = {
  /** User explicitly toggled notifications off in-app (even if OS permission is granted) */
  pushManuallyDisabled: boolean;
  notificationStatus: NotificationStatus;
  softDeclineCount: number;
  softLastDeclinedAt: number; // epoch ms
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  pushManuallyDisabled: false,
  notificationStatus: 'unknown',
  softDeclineCount: 0,
  softLastDeclinedAt: 0,
};

const STORAGE_KEY = `${DOMAIN.app.storageKey}-notification-preferences`;
const STORAGE_NAMESPACE = `${DOMAIN.app.cursorStorageId}-notifications`;

function getNativeStore() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createMMKV } = require('react-native-mmkv');
    return createMMKV({ id: STORAGE_NAMESPACE });
  } catch {
    return null;
  }
}

function mapLegacyStatus(status: string | undefined): NotificationStatus {
  switch (status) {
    case 'enabled':
      return NOTIFICATION_STATUS.GRANTED;
    case 'denied':
      return NOTIFICATION_STATUS.DENIED;
    case 'unavailable':
      return NOTIFICATION_STATUS.UNAVAILABLE;
    default:
      return NOTIFICATION_STATUS.UNKNOWN;
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

    const parsed = JSON.parse(raw) as Partial<NotificationPreferences> & {
      pushOptInStatus?: string;
      pushPromptAttempts?: number;
      pushLastPromptAt?: number;
    };
    const migrated: NotificationPreferences = {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      pushManuallyDisabled:
        typeof parsed.pushManuallyDisabled === 'boolean'
          ? parsed.pushManuallyDisabled
          : DEFAULT_NOTIFICATION_PREFERENCES.pushManuallyDisabled,
      notificationStatus: parsed.notificationStatus ?? mapLegacyStatus(parsed.pushOptInStatus),
      softDeclineCount:
        typeof parsed.softDeclineCount === 'number'
          ? parsed.softDeclineCount
          : DEFAULT_NOTIFICATION_PREFERENCES.softDeclineCount,
      softLastDeclinedAt:
        typeof parsed.softLastDeclinedAt === 'number'
          ? parsed.softLastDeclinedAt
          : DEFAULT_NOTIFICATION_PREFERENCES.softLastDeclinedAt,
    };

    return migrated;
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

export function clearNotificationPreferences() {
  if (Platform.OS === 'web') {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
      globalThis.localStorage.removeItem(STORAGE_KEY);
    }
    return;
  }

  const store = getNativeStore();
  store?.delete(STORAGE_KEY);
}
