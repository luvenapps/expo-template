import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  ensureNotificationPermission,
  scheduleLocalNotification,
  cancelScheduledNotification,
  cancelAllScheduledNotifications,
  incrementBadgeCount,
  resetBadgeCount,
  __resetBadgeCounterForTests,
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
  setBadgeCountAsync: jest.fn(),
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
const setBadgeCountAsync = Notifications.setBadgeCountAsync as jest.MockedFunction<
  typeof Notifications.setBadgeCountAsync
>;

describe('notifications helpers', () => {
  const originalPlatform = Platform.OS;

  // Suppress console logs from logger
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-apply console suppression after clearAllMocks
    logSpy.mockImplementation(() => {});
    infoSpy.mockImplementation(() => {});
    warnSpy.mockImplementation(() => {});
    __resetBadgeCounterForTests();
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

  afterAll(() => {
    logSpy.mockRestore();
    infoSpy.mockRestore();
    warnSpy.mockRestore();
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

  it('includes badge value when provided', async () => {
    getPermissionsAsync.mockResolvedValueOnce(grantedPermissions());
    scheduleNotificationAsync.mockResolvedValueOnce('id-2');

    const id = await scheduleLocalNotification({ title: 'Hi', body: 'Test', badge: 4 });

    expect(id).toBe('id-2');
    expect(scheduleNotificationAsync).toHaveBeenCalledWith({
      content: { title: 'Hi', body: 'Test', data: undefined, badge: 4 },
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

  it('increments badge count on iOS without updating system immediately', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' });

    const first = await incrementBadgeCount();
    const second = await incrementBadgeCount();

    expect(first).toBe(1);
    expect(second).toBe(2);
    expect(setBadgeCountAsync).not.toHaveBeenCalled();
  });

  it('returns null for badge increment on non-iOS platforms', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android' });

    const result = await incrementBadgeCount();

    expect(result).toBeNull();
    expect(setBadgeCountAsync).not.toHaveBeenCalled();
  });

  it('resets badge count on iOS', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' });
    setBadgeCountAsync.mockResolvedValueOnce(undefined as any);

    await resetBadgeCount();

    expect(setBadgeCountAsync).toHaveBeenCalledWith(0);
  });

  it('skips badge reset on non-iOS', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android' });

    await resetBadgeCount();

    expect(setBadgeCountAsync).not.toHaveBeenCalled();
  });
});
