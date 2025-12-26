import {
  ensureNotificationPermission,
  scheduleLocalNotification,
  incrementBadgeCount,
} from '@/notifications/notifications';
import * as Notifications from 'expo-notifications';
import dayjs from 'dayjs';
import { Platform } from 'react-native';
import { DOMAIN } from '@/config/domain.config';

export type ReminderPayload = {
  id: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  fireDate: Date;
};

const SCHEDULER_NAMESPACE = `${DOMAIN.app.name}-reminders`;
const REMINDER_CHANNEL_ID = 'REMINDERS';

export async function registerNotificationCategories() {
  if (Platform.OS === 'web') return;
  await Notifications.setNotificationCategoryAsync('REMINDER', [
    { identifier: 'SNOOZE', buttonTitle: 'Snooze', options: { opensAppToForeground: false } },
    { identifier: 'DISMISS', buttonTitle: 'Dismiss', options: { opensAppToForeground: false } },
  ]);
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function configureNotificationHandler() {
  if (Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
    handleSuccess: () => undefined,
    handleError: () => undefined,
  });
}

export async function scheduleReminder(payload: ReminderPayload): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const granted = await ensureNotificationPermission();
  if (!granted) {
    return null;
  }

  const triggerDate = payload.fireDate;
  const delaySeconds = Math.max(5, Math.ceil(dayjs(triggerDate).diff(dayjs(), 'second')));
  const trigger: Notifications.NotificationTriggerInput =
    Platform.OS === 'android'
      ? {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          channelId: REMINDER_CHANNEL_ID,
          seconds: delaySeconds,
          repeats: false,
        }
      : {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        };

  const badge = await incrementBadgeCount();

  return scheduleLocalNotification({
    title: payload.title,
    body: payload.body,
    data: {
      ...payload.data,
      namespace: SCHEDULER_NAMESPACE,
      reminderId: payload.id,
    },
    trigger,
    badge: badge ?? undefined,
  });
}
