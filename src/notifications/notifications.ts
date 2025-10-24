import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

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
  return requested.granted || requested.status === Notifications.PermissionStatus.GRANTED;
}

export async function scheduleLocalNotification({
  title,
  body,
  data,
  trigger,
}: LocalNotificationOptions) {
  if (Platform.OS === 'web') {
    return null;
  }

  const permissionGranted = await ensureNotificationPermission();
  if (!permissionGranted) {
    return null;
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
    },
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
