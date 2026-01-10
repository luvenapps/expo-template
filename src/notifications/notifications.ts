import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { analytics } from '@/observability/analytics';

let pendingBadgeCounter = 0;

/**
 * Local notifications helpers.
 *
 * Note: These are LOCAL notifications only, which work in Expo Go.
 * For REMOTE push notifications, you'll need a development build.
 * See: https://docs.expo.dev/develop/development-builds/introduction/
 */

export type LocalNotificationOptions = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  trigger?: Notifications.NotificationTriggerInput | null;
  badge?: number | null;
};

export async function ensureNotificationPermission() {
  const current = await Notifications.getPermissionsAsync();

  if (current.granted || current.status === Notifications.PermissionStatus.GRANTED) {
    return true;
  }

  if (!current.canAskAgain) {
    return false;
  }

  const requested = await Notifications.requestPermissionsAsync();
  analytics.trackEvent('notifications:permission-requested', {
    platform: Platform.OS,
    statusBefore: current.status,
    granted: requested.granted || requested.status === Notifications.PermissionStatus.GRANTED,
  });
  return requested.granted || requested.status === Notifications.PermissionStatus.GRANTED;
}

export async function scheduleLocalNotification({
  title,
  body,
  data,
  trigger,
  badge,
}: LocalNotificationOptions) {
  if (Platform.OS === 'web') {
    return null;
  }

  const permissionGranted = await ensureNotificationPermission();
  if (!permissionGranted) {
    return null;
  }

  const content: Notifications.NotificationContentInput = {
    title,
    body,
    data,
  };

  if (typeof badge === 'number') {
    content.badge = badge;
  }

  return Notifications.scheduleNotificationAsync({
    content,
    trigger: trigger ?? null,
  });
}

export async function cancelScheduledNotification(id: string) {
  if (Platform.OS === 'web') {
    return;
  }

  await Notifications.cancelScheduledNotificationAsync(id);
}

export async function cancelAllScheduledNotifications() {
  if (Platform.OS === 'web') {
    return;
  }

  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function incrementBadgeCount(): Promise<number | null> {
  if (Platform.OS !== 'ios') {
    return null;
  }

  try {
    pendingBadgeCounter += 1;
    return pendingBadgeCounter;
  } catch {
    return null;
  }
}

export async function resetBadgeCount() {
  pendingBadgeCounter = 0;
  if (Platform.OS !== 'ios') {
    return;
  }

  try {
    await Notifications.setBadgeCountAsync(0);
  } catch {
    // noop - badge reset is best-effort
  }
}

export function __resetBadgeCounterForTests() {
  pendingBadgeCounter = 0;
}
