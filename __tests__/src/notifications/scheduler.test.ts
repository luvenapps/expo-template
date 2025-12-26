import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import dayjs from 'dayjs';
import {
  registerNotificationCategories,
  configureNotificationHandler,
  scheduleReminder,
  ReminderPayload,
} from '@/notifications/scheduler';
import {
  ensureNotificationPermission,
  scheduleLocalNotification,
  incrementBadgeCount,
} from '@/notifications/notifications';
import { DOMAIN } from '@/config/domain.config';

jest.mock('expo-notifications', () => ({
  setNotificationCategoryAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
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

describe('scheduler', () => {
  const originalPlatform = Platform.OS;
  const incrementBadgeCountMock = incrementBadgeCount as jest.MockedFunction<
    typeof incrementBadgeCount
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    incrementBadgeCountMock.mockResolvedValue(1);
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
    });

    it('returns null when permission is not granted', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
      (ensureNotificationPermission as any).mockResolvedValue(false);

      const result = await scheduleReminder(mockPayload);

      expect(result).toBeNull();
      expect(scheduleLocalNotification).not.toHaveBeenCalled();
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
  });
});
