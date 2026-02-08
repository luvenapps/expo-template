import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import dayjs from 'dayjs';
import {
  registerNotificationCategories,
  configureNotificationHandler,
  scheduleReminder,
  scheduleReminderSeries,
  refreshReminderSeriesWindows,
  cancelReminderSeries,
  clearReminderSeriesConfigs,
  ReminderPayload,
  ReminderSeriesPayload,
} from '@/notifications/scheduler';
import {
  ensureNotificationPermission,
  scheduleLocalNotification,
  incrementBadgeCount,
} from '@/notifications/notifications';
import { DOMAIN } from '@/config/domain.config';
import { NOTIFICATIONS } from '@/config/constants';
import { analytics } from '@/observability/analytics';

// Mock MMKV storage
const mockMMKVStore = {
  set: jest.fn(),
  getString: jest.fn(),
  delete: jest.fn(),
  getAllKeys: jest.fn<() => string[]>(() => []),
};

jest.mock('react-native-mmkv', () => ({
  createMMKV: jest.fn().mockImplementation(() => mockMMKVStore),
}));

jest.mock('expo-notifications', () => ({
  setNotificationCategoryAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn<() => Promise<any[]>>(() => Promise.resolve([])),
  cancelScheduledNotificationAsync: jest.fn<() => Promise<void>>(() => Promise.resolve()),
  AndroidImportance: {
    DEFAULT: 3,
  },
  SchedulableTriggerInputTypes: {
    DATE: 'date',
    TIME_INTERVAL: 'timeInterval',
  },
}));

jest.mock('@/notifications/notifications', () => ({
  ensureNotificationPermission: jest.fn(),
  scheduleLocalNotification: jest.fn(),
  incrementBadgeCount: jest.fn(),
}));

jest.mock('@/observability/analytics', () => ({
  analytics: {
    trackEvent: jest.fn(),
  },
}));

describe('scheduler', () => {
  const originalPlatform = Platform.OS;
  const incrementBadgeCountMock = incrementBadgeCount as jest.MockedFunction<
    typeof incrementBadgeCount
  >;
  const trackEventMock = analytics.trackEvent as jest.MockedFunction<typeof analytics.trackEvent>;
  const getAllScheduledMock =
    Notifications.getAllScheduledNotificationsAsync as jest.MockedFunction<
      typeof Notifications.getAllScheduledNotificationsAsync
    >;
  const cancelScheduledMock = Notifications.cancelScheduledNotificationAsync as jest.MockedFunction<
    typeof Notifications.cancelScheduledNotificationAsync
  >;

  // Suppress console logs during tests
  const originalConsole = {
    log: console.log,
    info: console.info,
    error: console.error,
    warn: console.warn,
  };

  // Helper to create mock notification requests
  const createMockNotification = (
    identifier: string,
    reminderId: string,
    trigger: any = null,
  ): any => ({
    identifier,
    content: {
      title: 'Test',
      subtitle: null,
      body: null,
      data: { namespace: `${DOMAIN.app.name}-reminders`, reminderId },
      categoryIdentifier: null,
      sound: null,
    },
    trigger,
  });

  beforeAll(() => {
    // Suppress all console output during tests
    console.log = jest.fn();
    console.info = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  afterAll(() => {
    // Restore console after all tests
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    incrementBadgeCountMock.mockResolvedValue(1);
    getAllScheduledMock.mockResolvedValue([]);
    cancelScheduledMock.mockResolvedValue(undefined);
    mockMMKVStore.getAllKeys.mockReturnValue([]);
    mockMMKVStore.getString.mockReturnValue(undefined);
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      value: originalPlatform,
      configurable: true,
    });
  });

  describe('registerNotificationCategories', () => {
    it('returns early on web platform', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });

      await registerNotificationCategories();

      expect(Notifications.setNotificationCategoryAsync).not.toHaveBeenCalled();
      expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
    });

    it('sets notification category on iOS', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });

      await registerNotificationCategories();

      expect(Notifications.setNotificationCategoryAsync).toHaveBeenCalledWith('REMINDER', [
        { identifier: 'SNOOZE', buttonTitle: 'Snooze', options: { opensAppToForeground: false } },
        {
          identifier: 'DISMISS',
          buttonTitle: 'Dismiss',
          options: { opensAppToForeground: false },
        },
      ]);
      expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
    });

    it('sets notification category and channel on Android', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });

      await registerNotificationCategories();

      expect(Notifications.setNotificationCategoryAsync).toHaveBeenCalledWith('REMINDER', [
        { identifier: 'SNOOZE', buttonTitle: 'Snooze', options: { opensAppToForeground: false } },
        {
          identifier: 'DISMISS',
          buttonTitle: 'Dismiss',
          options: { opensAppToForeground: false },
        },
      ]);
      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('REMINDERS', {
        name: 'Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    });
  });

  describe('configureNotificationHandler', () => {
    it('returns early on web platform', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });

      await configureNotificationHandler();

      expect(Notifications.setNotificationHandler).not.toHaveBeenCalled();
    });

    it('configures notification handler on native platforms', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });

      await configureNotificationHandler();

      expect(Notifications.setNotificationHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          handleNotification: expect.any(Function),
          handleSuccess: expect.any(Function),
          handleError: expect.any(Function),
        }),
      );
    });

    it('configures handler with correct notification behavior', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });

      await configureNotificationHandler();

      const handler = (Notifications.setNotificationHandler as jest.Mock).mock.calls[0][0] as any;
      const result = await handler.handleNotification();

      expect(result).toEqual({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      });
    });

    it('configures handler with no-op success callback', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });

      await configureNotificationHandler();

      const handler = (Notifications.setNotificationHandler as jest.Mock).mock.calls[0][0] as any;
      const result = handler.handleSuccess();

      expect(result).toBeUndefined();
    });

    it('configures handler with no-op error callback', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });

      await configureNotificationHandler();

      const handler = (Notifications.setNotificationHandler as jest.Mock).mock.calls[0][0] as any;
      const result = handler.handleError();

      expect(result).toBeUndefined();
    });
  });

  describe('scheduleReminder', () => {
    const mockPayload: ReminderPayload = {
      id: 'reminder-123',
      title: 'Test Reminder',
      body: 'This is a test',
      data: { itemId: 'item-1' },
      fireDate: dayjs().add(1, 'hour').toDate(),
    };

    it('returns null on web platform', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });

      const result = await scheduleReminder(mockPayload);

      expect(result).toBeNull();
      expect(ensureNotificationPermission).not.toHaveBeenCalled();
      expect(trackEventMock).not.toHaveBeenCalled();
    });

    it('returns null when permission is not granted', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
      (ensureNotificationPermission as any).mockResolvedValue(false);

      const result = await scheduleReminder(mockPayload);

      expect(result).toBeNull();
      expect(scheduleLocalNotification).not.toHaveBeenCalled();
      expect(trackEventMock).not.toHaveBeenCalled();
    });

    it('schedules notification on iOS when permission is granted', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
      (ensureNotificationPermission as any).mockResolvedValue(true);
      (scheduleLocalNotification as any).mockResolvedValue('notification-id-123');
      incrementBadgeCountMock.mockResolvedValue(2);

      const result = await scheduleReminder(mockPayload);

      expect(result).toBe('notification-id-123');
      expect(scheduleLocalNotification).toHaveBeenCalledWith({
        title: 'Test Reminder',
        body: 'This is a test',
        data: {
          itemId: 'item-1',
          namespace: `${DOMAIN.app.name}-reminders`,
          reminderId: 'reminder-123',
        },
        trigger: expect.objectContaining({
          type: 'date',
          date: expect.any(Date),
        }),
        badge: 2,
      });
      expect(trackEventMock).toHaveBeenCalledWith(
        'reminders:sent',
        expect.objectContaining({
          reminderId: 'reminder-123',
          notificationId: 'notification-id-123',
          platform: 'ios',
          source: 'local',
        }),
      );
    });

    it('schedules notification on Android with seconds trigger', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
      (ensureNotificationPermission as any).mockResolvedValue(true);
      (scheduleLocalNotification as any).mockResolvedValue('notification-id-456');
      incrementBadgeCountMock.mockResolvedValue(null);

      const result = await scheduleReminder(mockPayload);

      expect(result).toBe('notification-id-456');
      expect(scheduleLocalNotification).toHaveBeenCalledWith({
        title: 'Test Reminder',
        body: 'This is a test',
        data: {
          itemId: 'item-1',
          namespace: `${DOMAIN.app.name}-reminders`,
          reminderId: 'reminder-123',
        },
        trigger: expect.objectContaining({
          type: 'timeInterval',
          channelId: 'REMINDERS',
          seconds: expect.any(Number),
          repeats: false,
        }),
        badge: undefined,
      });
      expect(trackEventMock).toHaveBeenCalledWith(
        'reminders:sent',
        expect.objectContaining({
          reminderId: 'reminder-123',
          notificationId: 'notification-id-456',
          platform: 'android',
          source: 'local',
        }),
      );
    });

    it('enforces minimum delay of 5 seconds', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
      (ensureNotificationPermission as any).mockResolvedValue(true);
      (scheduleLocalNotification as any).mockResolvedValue('notification-id');

      // Fire date in the past
      const pastPayload = {
        ...mockPayload,
        fireDate: dayjs().subtract(10, 'seconds').toDate(),
      };

      await scheduleReminder(pastPayload);

      const call = (scheduleLocalNotification as jest.Mock).mock.calls[0][0] as any;
      expect(call.trigger.seconds).toBeGreaterThanOrEqual(5);
    });

    it('includes custom data in notification payload', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
      (ensureNotificationPermission as any).mockResolvedValue(true);
      (scheduleLocalNotification as any).mockResolvedValue('notification-id');

      const customPayload = {
        ...mockPayload,
        data: {
          itemId: 'item-123',
          customField: 'customValue',
          count: 42,
        },
      };

      await scheduleReminder(customPayload);

      expect(scheduleLocalNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            itemId: 'item-123',
            customField: 'customValue',
            count: 42,
            namespace: `${DOMAIN.app.name}-reminders`,
            reminderId: 'reminder-123',
          },
        }),
      );
    });

    it('handles payload without custom data', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
      (ensureNotificationPermission as any).mockResolvedValue(true);
      (scheduleLocalNotification as any).mockResolvedValue('notification-id');

      const noDataPayload: ReminderPayload = {
        id: 'reminder-456',
        title: 'No Data Reminder',
        body: 'Test',
        fireDate: dayjs().add(1, 'hour').toDate(),
      };

      await scheduleReminder(noDataPayload);

      expect(scheduleLocalNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            namespace: `${DOMAIN.app.name}-reminders`,
            reminderId: 'reminder-456',
          },
        }),
      );
    });

    it('handles repeating reminders on iOS with minimum 60 second cadence', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
      (ensureNotificationPermission as any).mockResolvedValue(true);
      (scheduleLocalNotification as any).mockResolvedValue('notification-id');

      const repeatingPayload: ReminderPayload = {
        ...mockPayload,
        cadenceSeconds: 30, // Less than 60 seconds
      };

      await scheduleReminder(repeatingPayload);

      const call = (scheduleLocalNotification as jest.Mock).mock.calls[0][0] as any;
      expect(call.trigger.seconds).toBeGreaterThanOrEqual(60);
      expect(call.trigger.repeats).toBe(true);
    });

    it('handles repeating reminders on Android without minimum cadence enforcement', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
      (ensureNotificationPermission as any).mockResolvedValue(true);
      (scheduleLocalNotification as any).mockResolvedValue('notification-id');

      const repeatingPayload: ReminderPayload = {
        ...mockPayload,
        cadenceSeconds: 30,
      };

      await scheduleReminder(repeatingPayload);

      const call = (scheduleLocalNotification as jest.Mock).mock.calls[0][0] as any;
      expect(call.trigger.seconds).toBe(30);
      expect(call.trigger.repeats).toBe(true);
    });

    it('uses separate reminderId when provided', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
      (ensureNotificationPermission as any).mockResolvedValue(true);
      (scheduleLocalNotification as any).mockResolvedValue('notification-id');

      const payloadWithReminderId: ReminderPayload = {
        ...mockPayload,
        reminderId: 'custom-reminder-id',
      };

      await scheduleReminder(payloadWithReminderId);

      expect(scheduleLocalNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reminderId: 'custom-reminder-id',
          }),
        }),
      );
      expect(trackEventMock).toHaveBeenCalledWith(
        'reminders:sent',
        expect.objectContaining({
          reminderId: 'custom-reminder-id',
        }),
      );
    });

    it('tracks route when provided in data', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
      (ensureNotificationPermission as any).mockResolvedValue(true);
      (scheduleLocalNotification as any).mockResolvedValue('notification-id');

      const payloadWithRoute: ReminderPayload = {
        ...mockPayload,
        data: { route: '/(tabs)/settings' },
      };

      await scheduleReminder(payloadWithRoute);

      expect(trackEventMock).toHaveBeenCalledWith(
        'reminders:sent',
        expect.objectContaining({
          route: '/(tabs)/settings',
        }),
      );
    });

    it('does not track analytics when scheduling fails', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
      (ensureNotificationPermission as any).mockResolvedValue(true);
      (scheduleLocalNotification as any).mockResolvedValue(null);

      await scheduleReminder(mockPayload);

      expect(trackEventMock).not.toHaveBeenCalled();
    });
  });

  describe('scheduleReminderSeries', () => {
    const mockSeriesPayload: ReminderSeriesPayload = {
      idPrefix: 'daily-reminder',
      title: 'Daily Reminder',
      body: 'Time to check in',
      startDate: dayjs().add(1, 'hour').toDate(),
      cadenceSeconds: 86400, // 24 hours
    };

    beforeEach(() => {
      (ensureNotificationPermission as any).mockResolvedValue(true);
      (scheduleLocalNotification as any).mockResolvedValue('notification-id');
      mockMMKVStore.set.mockClear();
      mockMMKVStore.getAllKeys.mockReturnValue([]);
    });

    it('returns empty array on web platform', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });

      const result = await scheduleReminderSeries(mockSeriesPayload);

      expect(result).toEqual([]);
      expect(scheduleLocalNotification).not.toHaveBeenCalled();
    });

    it('schedules default number of instances when totalCount is not provided', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
      (scheduleLocalNotification as any).mockResolvedValue('notification-id-1');

      const result = await scheduleReminderSeries(mockSeriesPayload);

      expect(scheduleLocalNotification).toHaveBeenCalledTimes(
        NOTIFICATIONS.reminderSeriesDefaultCount,
      );
      expect(result).toHaveLength(NOTIFICATIONS.reminderSeriesDefaultCount);
    });

    it('schedules specified number of instances when totalCount is provided', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
      (scheduleLocalNotification as any).mockResolvedValue('notification-id');

      const payloadWithCount: ReminderSeriesPayload = {
        ...mockSeriesPayload,
        totalCount: 5,
      };

      const result = await scheduleReminderSeries(payloadWithCount);

      expect(scheduleLocalNotification).toHaveBeenCalledTimes(5);
      expect(result).toHaveLength(5);
    });

    it('stores series config when totalCount is not provided', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
      (scheduleLocalNotification as any).mockResolvedValue('notification-id');

      await scheduleReminderSeries(mockSeriesPayload);

      expect(mockMMKVStore.set).toHaveBeenCalledWith(
        expect.stringContaining('reminder-series:'),
        expect.stringContaining(mockSeriesPayload.title),
      );
    });

    it('does not store series config when totalCount is provided', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
      (scheduleLocalNotification as any).mockResolvedValue('notification-id');

      const payloadWithCount: ReminderSeriesPayload = {
        ...mockSeriesPayload,
        totalCount: 5,
      };

      await scheduleReminderSeries(payloadWithCount);

      expect(mockMMKVStore.set).not.toHaveBeenCalled();
    });

    it('uses custom reminderId when provided', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
      (scheduleLocalNotification as any).mockResolvedValue('notification-id');

      const payloadWithReminderId: ReminderSeriesPayload = {
        ...mockSeriesPayload,
        reminderId: 'custom-series-id',
      };

      await scheduleReminderSeries(payloadWithReminderId);

      const calls = (scheduleLocalNotification as jest.Mock).mock.calls;
      calls.forEach((call: any) => {
        expect(call[0].data.reminderId).toBe('custom-series-id');
      });
    });

    it('falls back to idPrefix when reminderId is not provided', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
      (scheduleLocalNotification as any).mockResolvedValue('notification-id');

      await scheduleReminderSeries(mockSeriesPayload);

      const calls = (scheduleLocalNotification as jest.Mock).mock.calls;
      calls.forEach((call: any) => {
        expect(call[0].data.reminderId).toBe('daily-reminder');
      });
    });

    it('schedules instances at correct intervals', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
      (scheduleLocalNotification as any).mockResolvedValue('notification-id');

      const startDate = dayjs().add(1, 'hour').toDate();
      const payload: ReminderSeriesPayload = {
        ...mockSeriesPayload,
        startDate,
        cadenceSeconds: 3600, // 1 hour
        totalCount: 3,
      };

      await scheduleReminderSeries(payload);

      const calls = (scheduleLocalNotification as jest.Mock).mock.calls as [any][];
      expect(calls[0]![0].trigger.date.getTime()).toBe(startDate.getTime());
      expect(calls[1]![0].trigger.date.getTime()).toBe(startDate.getTime() + 3600 * 1000);
      expect(calls[2]![0].trigger.date.getTime()).toBe(startDate.getTime() + 3600 * 1000 * 2);
    });

    it('includes custom data in all instances', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
      (scheduleLocalNotification as any).mockResolvedValue('notification-id');

      const payloadWithData: ReminderSeriesPayload = {
        ...mockSeriesPayload,
        data: { habitId: 'habit-123', customKey: 'customValue' },
        totalCount: 2,
      };

      await scheduleReminderSeries(payloadWithData);

      const calls = (scheduleLocalNotification as jest.Mock).mock.calls;
      calls.forEach((call: any) => {
        expect(call[0].data.habitId).toBe('habit-123');
        expect(call[0].data.customKey).toBe('customValue');
      });
    });

    it('handles partial scheduling failures gracefully', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
      (scheduleLocalNotification as any)
        .mockResolvedValueOnce('notification-1')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('notification-3');

      const payload: ReminderSeriesPayload = {
        ...mockSeriesPayload,
        totalCount: 3,
      };

      const result = await scheduleReminderSeries(payload);

      expect(result).toEqual(['notification-1', 'notification-3']);
      expect(result).toHaveLength(2);
    });
  });

  describe('refreshReminderSeriesWindows', () => {
    beforeEach(() => {
      mockMMKVStore.getAllKeys.mockReturnValue([]);
      mockMMKVStore.getString.mockReturnValue(undefined);
      getAllScheduledMock.mockResolvedValue([]);
      (ensureNotificationPermission as any).mockResolvedValue(true);
      (scheduleLocalNotification as any).mockResolvedValue('notification-id');
    });

    it('returns early on web platform', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });

      await refreshReminderSeriesWindows();

      expect(Notifications.getAllScheduledNotificationsAsync).not.toHaveBeenCalled();
    });

    it('returns early when no series configs exist', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
      mockMMKVStore.getAllKeys.mockReturnValue([]);

      await refreshReminderSeriesWindows();

      expect(Notifications.getAllScheduledNotificationsAsync).not.toHaveBeenCalled();
    });

    it('skips series that already have enough scheduled notifications', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });

      const config = {
        idPrefix: 'daily-reminder',
        reminderId: 'reminder-123',
        title: 'Daily Reminder',
        body: 'Check in',
        cadenceSeconds: 86400,
        windowCount: 3,
      };

      mockMMKVStore.getAllKeys.mockReturnValue(['reminder-series:reminder-123']);
      mockMMKVStore.getString.mockReturnValue(JSON.stringify(config));

      getAllScheduledMock.mockResolvedValue([
        {
          identifier: 'notif-1',
          content: {
            title: 'Test',
            subtitle: null,
            body: null,
            data: { namespace: `${DOMAIN.app.name}-reminders`, reminderId: 'reminder-123' },
            categoryIdentifier: null,
            sound: null,
          },
          trigger: { type: 'date', date: dayjs().add(1, 'day').valueOf() } as any,
        },
        {
          identifier: 'notif-2',
          content: {
            title: 'Test',
            subtitle: null,
            body: null,
            data: { namespace: `${DOMAIN.app.name}-reminders`, reminderId: 'reminder-123' },
            categoryIdentifier: null,
            sound: null,
          },
          trigger: { type: 'date', date: dayjs().add(2, 'days').valueOf() } as any,
        },
        {
          identifier: 'notif-3',
          content: {
            title: 'Test',
            subtitle: null,
            body: null,
            data: { namespace: `${DOMAIN.app.name}-reminders`, reminderId: 'reminder-123' },
            categoryIdentifier: null,
            sound: null,
          },
          trigger: { type: 'date', date: dayjs().add(3, 'days').valueOf() } as any,
        },
      ] as any);

      await refreshReminderSeriesWindows();

      expect(scheduleLocalNotification).not.toHaveBeenCalled();
    });

    it('schedules additional notifications when below window count', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });

      const config = {
        idPrefix: 'daily-reminder',
        reminderId: 'reminder-123',
        title: 'Daily Reminder',
        body: 'Check in',
        cadenceSeconds: 86400,
        windowCount: 3,
      };

      mockMMKVStore.getAllKeys.mockReturnValue(['reminder-series:reminder-123']);
      mockMMKVStore.getString.mockReturnValue(JSON.stringify(config));

      // Only 1 scheduled notification exists
      getAllScheduledMock.mockResolvedValue([
        createMockNotification('notif-1', 'reminder-123', {
          type: 'date',
          date: dayjs().add(1, 'day').valueOf(),
        }),
      ]);

      await refreshReminderSeriesWindows();

      // Should schedule 2 more to reach windowCount of 3
      expect(scheduleLocalNotification).toHaveBeenCalledTimes(2);
    });

    it('uses latest scheduled notification as base for new instances', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });

      const config = {
        idPrefix: 'daily-reminder',
        reminderId: 'reminder-123',
        title: 'Daily Reminder',
        body: 'Check in',
        cadenceSeconds: 3600, // 1 hour
        windowCount: 3,
      };

      mockMMKVStore.getAllKeys.mockReturnValue(['reminder-series:reminder-123']);
      mockMMKVStore.getString.mockReturnValue(JSON.stringify(config));

      const latestFireDate = dayjs().add(2, 'hours').toDate();
      getAllScheduledMock.mockResolvedValue([
        createMockNotification('notif-1', 'reminder-123', {
          type: 'date',
          date: latestFireDate.valueOf(),
        }),
      ]);

      await refreshReminderSeriesWindows();

      const calls = (scheduleLocalNotification as jest.Mock).mock.calls as [any][];
      const expectedNextDate = latestFireDate.getTime() + 3600 * 1000;
      expect(calls[0]![0].trigger.date.getTime()).toBe(expectedNextDate);
    });

    it('handles missing trigger dates gracefully', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });

      const config = {
        idPrefix: 'daily-reminder',
        reminderId: 'reminder-123',
        title: 'Daily Reminder',
        body: 'Check in',
        cadenceSeconds: 3600,
        windowCount: 3,
      };

      mockMMKVStore.getAllKeys.mockReturnValue(['reminder-series:reminder-123']);
      mockMMKVStore.getString.mockReturnValue(JSON.stringify(config));

      getAllScheduledMock.mockResolvedValue([
        createMockNotification('notif-1', 'reminder-123', null), // Invalid trigger
      ]);

      await refreshReminderSeriesWindows();

      // Should still schedule notifications starting from now
      expect(scheduleLocalNotification).toHaveBeenCalledTimes(2);
    });

    it('handles multiple series configurations', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });

      const config1 = {
        idPrefix: 'daily',
        reminderId: 'reminder-1',
        title: 'Daily',
        body: 'Check in',
        cadenceSeconds: 86400,
        windowCount: 3,
      };

      const config2 = {
        idPrefix: 'weekly',
        reminderId: 'reminder-2',
        title: 'Weekly',
        body: 'Review',
        cadenceSeconds: 604800,
        windowCount: 3,
      };

      mockMMKVStore.getAllKeys.mockReturnValue([
        'reminder-series:reminder-1',
        'reminder-series:reminder-2',
      ]);
      mockMMKVStore.getString
        .mockReturnValueOnce(JSON.stringify(config1))
        .mockReturnValueOnce(JSON.stringify(config2));

      getAllScheduledMock.mockResolvedValue([]);

      await refreshReminderSeriesWindows();

      // Should schedule 3 notifications for each series
      expect(scheduleLocalNotification).toHaveBeenCalledTimes(6);
    });

    it('handles corrupted config data gracefully', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });

      mockMMKVStore.getAllKeys.mockReturnValue(['reminder-series:reminder-123']);
      mockMMKVStore.getString.mockReturnValue('invalid-json{');

      await refreshReminderSeriesWindows();

      expect(scheduleLocalNotification).not.toHaveBeenCalled();
    });

    it('handles trigger with seconds property', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });

      const config = {
        idPrefix: 'daily-reminder',
        reminderId: 'reminder-123',
        title: 'Daily Reminder',
        body: 'Check in',
        cadenceSeconds: 3600,
        windowCount: 3,
      };

      mockMMKVStore.getAllKeys.mockReturnValue(['reminder-series:reminder-123']);
      mockMMKVStore.getString.mockReturnValue(JSON.stringify(config));

      getAllScheduledMock.mockResolvedValue([
        createMockNotification('notif-1', 'reminder-123', {
          type: 'timeInterval',
          seconds: 3600,
        }), // Trigger with seconds instead of date
      ]);

      await refreshReminderSeriesWindows();

      // Should still schedule additional notifications
      expect(scheduleLocalNotification).toHaveBeenCalledTimes(2);
    });
  });

  describe('cancelReminderSeries', () => {
    beforeEach(() => {
      mockMMKVStore.delete.mockClear();
      getAllScheduledMock.mockResolvedValue([]);
      cancelScheduledMock.mockResolvedValue(undefined);
    });

    it('returns early on web platform', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });

      await cancelReminderSeries('reminder-123');

      expect(mockMMKVStore.delete).not.toHaveBeenCalled();
      expect(Notifications.getAllScheduledNotificationsAsync).not.toHaveBeenCalled();
    });

    it('deletes series config from storage', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });

      await cancelReminderSeries('reminder-123');

      expect(mockMMKVStore.delete).toHaveBeenCalledWith('reminder-series:reminder-123');
    });

    it('cancels all matching scheduled notifications', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });

      getAllScheduledMock.mockResolvedValue([
        createMockNotification('notif-1', 'reminder-123'),
        createMockNotification('notif-2', 'reminder-123'),
        createMockNotification('notif-3', 'other-reminder'),
      ]);

      await cancelReminderSeries('reminder-123');

      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(2);
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-1');
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-2');
      expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('notif-3');
    });

    it('handles notifications with missing data gracefully', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });

      getAllScheduledMock.mockResolvedValue([
        {
          identifier: 'notif-1',
          content: {
            title: null,
            subtitle: null,
            body: null,
            data: {},
            categoryIdentifier: null,
            sound: null,
          },
          trigger: null,
        } as any,
        {
          identifier: 'notif-2',
          content: {
            title: null,
            subtitle: null,
            body: null,
            data: {},
            categoryIdentifier: null,
            sound: null,
          },
          trigger: null,
        } as any,
        createMockNotification('notif-3', 'reminder-123'),
      ]);

      await cancelReminderSeries('reminder-123');

      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(1);
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-3');
    });

    it('handles errors from storage deletion gracefully', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
      mockMMKVStore.delete.mockImplementation(() => {
        throw new Error('Storage error');
      });

      await expect(cancelReminderSeries('reminder-123')).resolves.not.toThrow();
    });
  });

  describe('clearReminderSeriesConfigs', () => {
    beforeEach(() => {
      mockMMKVStore.delete.mockReset();
      mockMMKVStore.getAllKeys.mockReset();
      mockMMKVStore.getAllKeys.mockReturnValue([]);
    });

    it('returns early on web platform', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });

      await clearReminderSeriesConfigs();

      expect(mockMMKVStore.getAllKeys).not.toHaveBeenCalled();
    });

    it('deletes all reminder series configs', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });

      mockMMKVStore.getAllKeys.mockReturnValue([
        'reminder-series:reminder-1',
        'reminder-series:reminder-2',
        'other-key',
        'reminder-series:reminder-3',
      ]);

      await clearReminderSeriesConfigs();

      expect(mockMMKVStore.delete).toHaveBeenCalledTimes(3);
      expect(mockMMKVStore.delete).toHaveBeenCalledWith('reminder-series:reminder-1');
      expect(mockMMKVStore.delete).toHaveBeenCalledWith('reminder-series:reminder-2');
      expect(mockMMKVStore.delete).toHaveBeenCalledWith('reminder-series:reminder-3');
      expect(mockMMKVStore.delete).not.toHaveBeenCalledWith('other-key');
    });

    it('handles empty storage gracefully', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
      mockMMKVStore.getAllKeys.mockReturnValue([]);

      await clearReminderSeriesConfigs();

      expect(mockMMKVStore.delete).not.toHaveBeenCalled();
    });

    it('handles storage errors gracefully', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
      mockMMKVStore.getAllKeys.mockImplementation(() => {
        throw new Error('Storage error');
      });

      await expect(clearReminderSeriesConfigs()).resolves.not.toThrow();
    });
  });
});
