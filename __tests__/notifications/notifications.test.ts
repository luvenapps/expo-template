import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  ensureNotificationPermission,
  scheduleLocalNotification,
  cancelScheduledNotification,
  cancelAllScheduledNotifications,
} from '@/notifications/notifications';

type PermissionResult = Notifications.NotificationPermissionsStatus;

jest.mock('expo-notifications', () => ({
  // Export PermissionStatus enum that tests need
  PermissionStatus: {
    GRANTED: 'granted',
    UNDETERMINED: 'undetermined',
    DENIED: 'denied',
  },
  // Mock the functions we use
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
}));

const getPermissionsAsync = Notifications.getPermissionsAsync as jest.MockedFunction<
  typeof Notifications.getPermissionsAsync
>;
const requestPermissionsAsync = Notifications.requestPermissionsAsync as jest.MockedFunction<
  typeof Notifications.requestPermissionsAsync
>;
const scheduleNotificationAsync = Notifications.scheduleNotificationAsync as jest.MockedFunction<
  typeof Notifications.scheduleNotificationAsync
>;
const cancelAsync = Notifications.cancelScheduledNotificationAsync as jest.MockedFunction<
  typeof Notifications.cancelScheduledNotificationAsync
>;
const cancelAllAsync = Notifications.cancelAllScheduledNotificationsAsync as jest.MockedFunction<
  typeof Notifications.cancelAllScheduledNotificationsAsync
>;

describe('notifications helpers', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', {
      value: 'ios',
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      value: originalPlatform,
      configurable: true,
    });
  });

  const grantedPermissions = (overrides: Partial<PermissionResult> = {}): PermissionResult => ({
    status: Notifications.PermissionStatus.GRANTED,
    granted: true,
    canAskAgain: false,
    expires: 'never',
    ...overrides,
  });

  it('returns true when permission already granted', async () => {
    getPermissionsAsync.mockResolvedValueOnce(grantedPermissions());

    await expect(ensureNotificationPermission()).resolves.toBe(true);
    expect(requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('requests permission when not granted and can ask', async () => {
    getPermissionsAsync.mockResolvedValueOnce(
      grantedPermissions({
        status: Notifications.PermissionStatus.DENIED,
        granted: false,
        canAskAgain: true,
      }),
    );
    requestPermissionsAsync.mockResolvedValueOnce(grantedPermissions());

    await expect(ensureNotificationPermission()).resolves.toBe(true);
    expect(requestPermissionsAsync).toHaveBeenCalled();
  });

  it('returns false when permission denied and cannot ask again', async () => {
    getPermissionsAsync.mockResolvedValueOnce(
      grantedPermissions({
        status: Notifications.PermissionStatus.DENIED,
        granted: false,
        canAskAgain: false,
      }),
    );

    await expect(ensureNotificationPermission()).resolves.toBe(false);
  });

  it('schedules notification when granted', async () => {
    getPermissionsAsync.mockResolvedValueOnce(grantedPermissions());
    scheduleNotificationAsync.mockResolvedValueOnce('id-1');

    const id = await scheduleLocalNotification({ title: 'Hi', body: 'Test' });

    expect(id).toBe('id-1');
    expect(scheduleNotificationAsync).toHaveBeenCalledWith({
      content: { title: 'Hi', body: 'Test', data: undefined },
      trigger: null,
    });
  });

  it('does not schedule when permission denied', async () => {
    getPermissionsAsync.mockResolvedValueOnce(
      grantedPermissions({
        status: Notifications.PermissionStatus.DENIED,
        granted: false,
        canAskAgain: false,
      }),
    );

    const id = await scheduleLocalNotification({ title: 'Hi', body: 'Test' });
    expect(id).toBeNull();
    expect(scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('returns null on web without scheduling', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web' });
    const id = await scheduleLocalNotification({ title: 'Hi', body: 'Test' });
    expect(id).toBeNull();
    expect(scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('cancels notification on native', async () => {
    await cancelScheduledNotification('abc');
    expect(cancelAsync).toHaveBeenCalledWith('abc');
  });

  it('skips cancel on web', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web' });
    await cancelScheduledNotification('abc');
    expect(cancelAsync).not.toHaveBeenCalled();
  });

  it('cancels all notifications on native', async () => {
    await cancelAllScheduledNotifications();
    expect(cancelAllAsync).toHaveBeenCalled();
  });

  it('skips cancel all on web', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web' });
    await cancelAllScheduledNotifications();
    expect(cancelAllAsync).not.toHaveBeenCalled();
  });
});
