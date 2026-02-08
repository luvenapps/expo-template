import {
  ensureNotificationPermission,
  scheduleLocalNotification,
  incrementBadgeCount,
} from '@/notifications/notifications';
import * as Notifications from 'expo-notifications';
import dayjs from 'dayjs';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { DOMAIN } from '@/config/domain.config';
import { NOTIFICATIONS } from '@/config/constants';
import { analytics } from '@/observability/analytics';
import { createLogger } from '@/observability/logger';

export type ReminderPayload = {
  id: string;
  reminderId?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  fireDate: Date;
  cadenceSeconds?: number;
};

export type ReminderSeriesPayload = {
  idPrefix: string;
  reminderId?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  startDate: Date;
  cadenceSeconds: number;
  totalCount?: number;
};

const SCHEDULER_NAMESPACE = `${DOMAIN.app.name}-reminders`;
const REMINDER_CHANNEL_ID = 'REMINDERS';
const REMINDER_SERIES_KEY_PREFIX = 'reminder-series:';
const reminderLogger = createLogger('ReminderScheduler');

type ReminderSeriesConfig = {
  idPrefix: string;
  reminderId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  cadenceSeconds: number;
  windowCount: number;
};

const getReminderSeriesStore = () => {
  try {
    if (Constants.executionEnvironment === 'storeClient' || Constants.appOwnership === 'expo') {
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createMMKV } = require('react-native-mmkv');
    return createMMKV({ id: `${DOMAIN.app.name}-notifications` });
  } catch {
    return null;
  }
};

const serializeSeriesConfig = (config: ReminderSeriesConfig) => JSON.stringify(config);

const parseSeriesConfig = (value: string): ReminderSeriesConfig | null => {
  try {
    return JSON.parse(value) as ReminderSeriesConfig;
  } catch (error) {
    reminderLogger.error('Failed to parse reminder series config', error);
    return null;
  }
};

const storeReminderSeriesConfig = (config: ReminderSeriesConfig) => {
  const store = getReminderSeriesStore();
  if (!store) return;
  try {
    store.set(`${REMINDER_SERIES_KEY_PREFIX}${config.reminderId}`, serializeSeriesConfig(config));
  } catch (error) {
    reminderLogger.error('Failed to persist reminder series config', error);
  }
};

const deleteReminderSeriesConfig = (reminderId: string) => {
  const store = getReminderSeriesStore();
  if (!store) return;
  try {
    store.delete(`${REMINDER_SERIES_KEY_PREFIX}${reminderId}`);
  } catch (error) {
    reminderLogger.error('Failed to delete reminder series config', error);
  }
};

const loadReminderSeriesConfigs = (): ReminderSeriesConfig[] => {
  const store = getReminderSeriesStore();
  if (!store) return [];
  try {
    const rawValues: (string | undefined)[] = store
      .getAllKeys()
      .filter((key: string) => key.startsWith(REMINDER_SERIES_KEY_PREFIX))
      .map((key: string) => store.getString(key));

    return rawValues
      .filter((value: string | undefined): value is string => typeof value === 'string')
      .map((value: string) => parseSeriesConfig(value))
      .filter((value: ReminderSeriesConfig | null): value is ReminderSeriesConfig =>
        Boolean(value),
      );
  } catch (error) {
    reminderLogger.error('Failed to load reminder series configs', error);
    return [];
  }
};

export async function clearReminderSeriesConfigs() {
  if (Platform.OS === 'web') return;
  const store = getReminderSeriesStore();
  if (!store) return;
  try {
    store
      .getAllKeys()
      .filter((key: string) => key.startsWith(REMINDER_SERIES_KEY_PREFIX))
      .forEach((key: string) => store.delete(key));
  } catch (error) {
    reminderLogger.error('Failed to clear reminder series configs', error);
  }
}

const extractScheduledFireDate = (
  trigger: Notifications.NotificationTrigger | null,
): Date | null => {
  if (!trigger || typeof trigger !== 'object') return null;
  if ('date' in trigger && trigger.date) {
    return new Date(trigger.date);
  }
  if ('seconds' in trigger && typeof trigger.seconds === 'number') {
    return new Date(Date.now() + trigger.seconds * 1000);
  }
  return null;
};

type ReminderSeriesInstancePayload = {
  idPrefix: string;
  reminderId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  startDate: Date;
  cadenceSeconds: number;
  count: number;
};

const scheduleReminderSeriesInstances = async (
  payload: ReminderSeriesInstancePayload,
): Promise<string[]> => {
  const scheduledIds: string[] = [];

  for (let i = 0; i < payload.count; i += 1) {
    const fireDate = new Date(payload.startDate.getTime() + payload.cadenceSeconds * 1000 * i);
    const id = `${payload.idPrefix}-${fireDate.getTime()}`;
    const result = await scheduleReminder({
      id,
      reminderId: payload.reminderId,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      fireDate,
    });

    if (result) {
      scheduledIds.push(result);
    }
  }

  return scheduledIds;
};

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
  const repeatSeconds =
    payload.cadenceSeconds && Platform.OS === 'ios'
      ? Math.max(60, payload.cadenceSeconds)
      : payload.cadenceSeconds;
  const trigger: Notifications.NotificationTriggerInput = repeatSeconds
    ? {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        channelId: Platform.OS === 'android' ? REMINDER_CHANNEL_ID : undefined,
        seconds: repeatSeconds,
        repeats: true,
      }
    : Platform.OS === 'android'
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

  const notificationId = await scheduleLocalNotification({
    title: payload.title,
    body: payload.body,
    data: {
      ...payload.data,
      namespace: SCHEDULER_NAMESPACE,
      reminderId: payload.reminderId ?? payload.id,
    },
    trigger,
    badge: badge ?? undefined,
  });

  if (notificationId) {
    const route = typeof payload.data?.route === 'string' ? payload.data.route : null;
    analytics.trackEvent('reminders:sent', {
      reminderId: payload.reminderId ?? payload.id,
      notificationId,
      route,
      fireDate: payload.fireDate.toISOString(),
      platform: Platform.OS,
      source: 'local',
    });
  }

  return notificationId;
}

export async function scheduleReminderSeries(payload: ReminderSeriesPayload): Promise<string[]> {
  if (Platform.OS === 'web') return [];

  const count = payload.totalCount ?? NOTIFICATIONS.reminderSeriesDefaultCount;
  const reminderId = payload.reminderId ?? payload.idPrefix;
  const scheduledIds = await scheduleReminderSeriesInstances({
    idPrefix: payload.idPrefix,
    reminderId,
    title: payload.title,
    body: payload.body,
    data: payload.data,
    startDate: payload.startDate,
    cadenceSeconds: payload.cadenceSeconds,
    count,
  });

  if (payload.totalCount === undefined) {
    storeReminderSeriesConfig({
      idPrefix: payload.idPrefix,
      reminderId,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      cadenceSeconds: payload.cadenceSeconds,
      windowCount: NOTIFICATIONS.reminderSeriesDefaultCount,
    });
  }

  return scheduledIds;
}

export async function refreshReminderSeriesWindows() {
  if (Platform.OS === 'web') return;

  const configs = loadReminderSeriesConfigs();
  if (configs.length === 0) return;

  reminderLogger.info('Refreshing reminder series window', { seriesCount: configs.length });
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const now = Date.now();

  for (const config of configs) {
    const matching = scheduled.filter((request) => {
      const data = request?.content?.data ?? {};
      return data.namespace === SCHEDULER_NAMESPACE && data.reminderId === config.reminderId;
    });

    if (matching.length >= config.windowCount) {
      continue;
    }

    const latestFire = matching
      .map((request) => extractScheduledFireDate(request.trigger))
      .filter((value): value is Date => Boolean(value))
      .reduce<Date | null>((latest, value) => {
        if (!latest) return value;
        return value > latest ? value : latest;
      }, null);

    const startDate = latestFire
      ? new Date(latestFire.getTime() + config.cadenceSeconds * 1000)
      : new Date(now + config.cadenceSeconds * 1000);
    const needed = Math.max(0, config.windowCount - matching.length);
    if (needed === 0) continue;

    reminderLogger.info('Scheduling reminder top-up', {
      reminderId: config.reminderId,
      needed,
      windowCount: config.windowCount,
    });
    await scheduleReminderSeriesInstances({
      idPrefix: config.idPrefix,
      reminderId: config.reminderId,
      title: config.title,
      body: config.body,
      data: config.data,
      startDate,
      cadenceSeconds: config.cadenceSeconds,
      count: needed,
    });
  }
}

export async function cancelReminderSeries(reminderId: string) {
  if (Platform.OS === 'web') return;
  deleteReminderSeriesConfig(reminderId);

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const matching = scheduled.filter((request) => {
    const data = request?.content?.data ?? {};
    return data.namespace === SCHEDULER_NAMESPACE && data.reminderId === reminderId;
  });

  await Promise.all(
    matching.map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)),
  );
}
