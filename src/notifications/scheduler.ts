import { NotificationPreferences } from '@/notifications/preferences';
import {
  ensureNotificationPermission,
  scheduleLocalNotification,
} from '@/notifications/notifications';
import { useAnalytics } from '@/observability/AnalyticsProvider';
import * as Notifications from 'expo-notifications';
import dayjs from 'dayjs';
import { Platform } from 'react-native';

export type ReminderPayload = {
  id: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  fireDate: Date;
};

const SCHEDULER_NAMESPACE = 'betterhabits-reminders';
const QUIET_HOURS_BUFFER_MINUTES = 5;

export async function registerNotificationCategories() {
  if (Platform.OS === 'web') return;
  await Notifications.setNotificationCategoryAsync('REMINDER', [
    { identifier: 'SNOOZE', buttonTitle: 'Snooze', options: { opensAppToForeground: false } },
    { identifier: 'DISMISS', buttonTitle: 'Dismiss', options: { opensAppToForeground: false } },
  ]);
}

export async function configureNotificationHandler() {
  if (Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
    handleSuccess: () => undefined,
    handleError: () => undefined,
  });
}

export type ScheduleOptions = {
  quietHours: NotificationPreferences['quietHours'];
};

export async function scheduleReminder(
  payload: ReminderPayload,
  options: ScheduleOptions,
): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const granted = await ensureNotificationPermission();
  if (!granted) {
    return null;
  }

  const trigger = buildTrigger(payload.fireDate, options.quietHours);
  return scheduleLocalNotification({
    title: payload.title,
    body: payload.body,
    data: {
      ...payload.data,
      namespace: SCHEDULER_NAMESPACE,
      reminderId: payload.id,
    },
    trigger,
  });
}

function buildTrigger(
  fireDate: Date,
  quietHours: NotificationPreferences['quietHours'],
): Notifications.NotificationTriggerInput {
  const date = dayjs(fireDate);
  if (isOutsideQuietHours(date, quietHours)) {
    return {
      channelId: 'DEFAULT',
      seconds: Math.max(1, Math.floor(date.diff(dayjs(), 'second'))),
    };
  }

  const [quietStart, quietEnd] = quietHours;
  const nextAllowed =
    quietEnd > quietStart
      ? date.hour(quietEnd).minute(QUIET_HOURS_BUFFER_MINUTES)
      : date.add(1, 'day').hour(quietEnd).minute(QUIET_HOURS_BUFFER_MINUTES);

  return {
    channelId: 'DEFAULT',
    seconds: Math.max(1, Math.floor(nextAllowed.diff(dayjs(), 'second'))),
  };
}

function isOutsideQuietHours(date: dayjs.Dayjs, quietHours: [number, number]) {
  const [quietStart, quietEnd] = quietHours;
  if (quietStart === quietEnd) {
    return true;
  }

  const hour = date.hour();
  if (quietStart < quietEnd) {
    return hour < quietStart || hour >= quietEnd;
  }
  return hour >= quietEnd && hour < quietStart;
}
