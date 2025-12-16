import { Platform } from 'react-native';
import { NOTIFICATIONS } from '@/config/constants';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NotificationStatus,
  loadNotificationPreferences,
  persistNotificationPreferences,
} from './preferences';
import * as web from './notificationPlatform.web';
import * as native from './notificationPlatform.native';

type EnsureResult =
  | { status: 'enabled' }
  | { status: 'denied'; message?: string }
  | { status: 'unavailable'; message?: string }
  | { status: 'error'; message?: string }
  | { status: 'cooldown'; remainingDays: number }
  | { status: 'exhausted' };

const platform = Platform.OS === 'web' ? web : native;

export async function ensureNotificationsEnabled(options?: {
  context?: string;
  skipSoftPrompt?: boolean; // Reserved for Phase 2; always true in Phase 1
  /** Force a registration attempt even if stored prefs say granted/denied (used for permission sync) */
  forceRegister?: boolean;
}): Promise<EnsureResult> {
  const prefs = loadNotificationPreferences();
  const now = Date.now();

  // Early returns for terminal states (unless explicitly forcing a re-register)
  if (!options?.forceRegister) {
    if (prefs.notificationStatus === 'granted') {
      return { status: 'enabled' };
    }
    if (prefs.notificationStatus === 'denied') {
      return { status: 'denied' };
    }
    if (prefs.notificationStatus === 'unavailable') {
      return { status: 'unavailable' };
    }
  }

  // Attempt exhaustion (skip when forceRegister=true; used for permission-sync recovery)
  if (!options?.forceRegister) {
    if (prefs.osPromptAttempts >= NOTIFICATIONS.osPromptMaxAttempts) {
      return { status: 'exhausted' };
    }

    // Cooldown check
    if (prefs.osLastPromptAt && now - prefs.osLastPromptAt < NOTIFICATIONS.osPromptCooldownMs) {
      const remainingMs = NOTIFICATIONS.osPromptCooldownMs - (now - prefs.osLastPromptAt);
      const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
      return { status: 'cooldown', remainingDays };
    }
  }

  // Request OS permission (no soft prompt in Phase 1)
  const result = await platform.requestPermission();

  if (result.status === 'granted') {
    persistNotificationPreferences({
      ...prefs,
      notificationStatus: 'granted',
      pushManuallyDisabled: false,
      osPromptAttempts: 0,
      osLastPromptAt: options?.forceRegister ? 0 : now,
    });
    return { status: 'enabled' };
  }

  if (result.status === 'unavailable') {
    persistNotificationPreferences({
      ...prefs,
      notificationStatus: 'unavailable',
      osLastPromptAt: now,
    });
    return { status: 'unavailable', message: result.message };
  }

  // Denied or error count as an attempt; mark as denied
  persistNotificationPreferences({
    ...prefs,
    notificationStatus: 'denied',
    pushManuallyDisabled: false,
    osPromptAttempts: prefs.osPromptAttempts + 1,
    osLastPromptAt: now,
  });

  if (result.status === 'error') {
    return { status: 'error', message: result.message };
  }

  return { status: 'denied', message: result.message };
}

export async function revokeNotifications() {
  // For now, just delegate to platform revoke (which deletes token) and reset prefs
  await platform.revokePermission();
  persistNotificationPreferences({
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    notificationStatus: 'unknown',
  });
}

export { NotificationStatus };
