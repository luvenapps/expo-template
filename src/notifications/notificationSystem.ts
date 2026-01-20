import { createLogger } from '@/observability/logger';
import {
  NOTIFICATION_PLATFORM_STATUS,
  NOTIFICATION_STATUS,
  type NotificationStatus,
} from '@/notifications/status';
import { Platform } from 'react-native';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  loadNotificationPreferences,
  persistNotificationPreferences,
} from './preferences';
import * as web from './notificationPlatform.web';
import * as native from './notificationPlatform.native';

const logger = createLogger('EnsureNotif');

type EnsureResult =
  | { status: 'enabled' }
  | { status: 'denied'; message?: string }
  | { status: 'unavailable'; message?: string }
  | { status: 'error'; message?: string };

const platform = Platform.OS === 'web' ? web : native;

export async function ensureNotificationsEnabled(options?: {
  context?: string;
  skipSoftPrompt?: boolean; // Reserved for Phase 2; always true in Phase 1
  /** Force a registration attempt even if stored prefs say granted/denied (used for permission sync) */
  forceRegister?: boolean;
}): Promise<EnsureResult> {
  const prefs = loadNotificationPreferences();
  logger.debug('Called with options:', { options, prefs });

  // Early returns for terminal states (unless explicitly forcing a re-register)
  if (!options?.forceRegister) {
    if (prefs.notificationStatus === NOTIFICATION_STATUS.GRANTED) {
      logger.debug('Early return - already granted');
      return { status: 'enabled' };
    }
    if (prefs.notificationStatus === NOTIFICATION_STATUS.DENIED) {
      logger.debug('Early return - already denied');
      return { status: 'denied' };
    }
    if (prefs.notificationStatus === NOTIFICATION_STATUS.UNAVAILABLE) {
      logger.debug('Early return - unavailable');
      return { status: 'unavailable' };
    }
  }

  // Request OS permission (no soft prompt in Phase 1)
  logger.debug('Calling platform.requestPermission...');
  const result = await platform.requestPermission();
  logger.debug('platform.requestPermission result:', result);

  if (result.status === NOTIFICATION_PLATFORM_STATUS.GRANTED) {
    logger.debug('Persisting granted status');
    persistNotificationPreferences({
      ...prefs,
      notificationStatus: NOTIFICATION_STATUS.GRANTED,
      pushManuallyDisabled: false,
    });
    return { status: 'enabled' };
  }

  if (result.status === NOTIFICATION_PLATFORM_STATUS.UNAVAILABLE) {
    logger.debug('Persisting unavailable status');
    persistNotificationPreferences({
      ...prefs,
      notificationStatus: NOTIFICATION_STATUS.UNAVAILABLE,
    });
    return { status: 'unavailable', message: result.message };
  }

  // Denied or error: mark as denied
  logger.debug('Persisting denied status (result was:', result.status);
  persistNotificationPreferences({
    ...prefs,
    notificationStatus: NOTIFICATION_STATUS.DENIED,
    pushManuallyDisabled: false,
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
    notificationStatus: NOTIFICATION_STATUS.UNKNOWN,
  });
}

export { NotificationStatus };
