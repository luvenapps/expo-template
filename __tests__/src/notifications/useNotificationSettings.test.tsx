import { act, renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { useNotificationSettings } from '@/notifications/useNotificationSettings';

jest.mock('@/notifications/preferences', () => ({
  loadNotificationPreferences: jest.fn(),
  persistNotificationPreferences: jest.fn(),
}));

jest.mock('@/notifications/notifications', () => ({
  ensureNotificationPermission: jest.fn(),
  cancelAllScheduledNotifications: jest.fn(),
}));

jest.mock('@/observability/AnalyticsProvider', () => ({
  useAnalytics: jest.fn(() => ({
    trackEvent: jest.fn(),
    trackError: jest.fn(),
    trackPerformance: jest.fn(),
  })),
}));

jest.mock('expo-notifications', () => ({
  PermissionStatus: {
    GRANTED: 'granted',
    DENIED: 'denied',
  },
  getPermissionsAsync: jest.fn(),
}));

const preferenceModule = require('@/notifications/preferences');
const notificationModule = require('@/notifications/notifications');
const analyticsModule = require('@/observability/AnalyticsProvider');
const expoNotifications = require('expo-notifications');

const loadNotificationPreferences =
  preferenceModule.loadNotificationPreferences as jest.MockedFunction<
    typeof preferenceModule.loadNotificationPreferences
  >;
const persistNotificationPreferences =
  preferenceModule.persistNotificationPreferences as jest.MockedFunction<
    typeof preferenceModule.persistNotificationPreferences
  >;
const ensureNotificationPermission =
  notificationModule.ensureNotificationPermission as jest.MockedFunction<
    typeof notificationModule.ensureNotificationPermission
  >;
const cancelAllScheduledNotifications =
  notificationModule.cancelAllScheduledNotifications as jest.MockedFunction<
    typeof notificationModule.cancelAllScheduledNotifications
  >;
const useAnalytics = analyticsModule.useAnalytics as jest.MockedFunction<
  typeof analyticsModule.useAnalytics
>;
const getPermissionsAsync = expoNotifications.getPermissionsAsync as jest.MockedFunction<
  typeof expoNotifications.getPermissionsAsync
>;

describe('useNotificationSettings', () => {
  const originalPlatform = Platform.OS;
  const trackEvent = jest.fn();
  const trackError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    trackEvent.mockClear();
    trackError.mockClear();
    Object.defineProperty(Platform, 'OS', { value: 'ios' });
    useAnalytics.mockReturnValue({
      trackEvent,
      trackError,
      trackPerformance: jest.fn(),
    });
    loadNotificationPreferences.mockReturnValue({
      remindersEnabled: false,
      dailySummaryEnabled: false,
      quietHours: [20, 23],
    });
    getPermissionsAsync.mockResolvedValue({
      granted: false,
      status: expoNotifications.PermissionStatus.DENIED,
      canAskAgain: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalPlatform });
  });

  it('loads preferences and evaluates permission status on mount', async () => {
    const { result } = renderHook(() => useNotificationSettings());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.remindersEnabled).toBe(false);
    expect(result.current.permissionStatus).toBe('denied');
  });

  it('enables reminders when permission granted', async () => {
    ensureNotificationPermission.mockResolvedValue(true);

    const { result } = renderHook(() => useNotificationSettings());

    await act(async () => {
      await result.current.toggleReminders(true);
    });

    expect(persistNotificationPreferences).toHaveBeenCalledWith(
      expect.objectContaining({ remindersEnabled: true }),
    );
    expect(trackEvent).toHaveBeenCalledWith('notifications:reminders', { enabled: true });
    expect(result.current.remindersEnabled).toBe(true);
  });

  it('reports error and reverts toggle when permission denied', async () => {
    ensureNotificationPermission.mockResolvedValue(false);
    getPermissionsAsync.mockResolvedValue({
      granted: false,
      status: expoNotifications.PermissionStatus.DENIED,
      canAskAgain: false,
    });

    const { result } = renderHook(() => useNotificationSettings());

    await act(async () => {
      await result.current.toggleReminders(true);
    });

    expect(result.current.remindersEnabled).toBe(false);
    expect(result.current.error).toBe(
      'Enable notifications in system settings to turn on reminders.',
    );
    expect(trackEvent).toHaveBeenCalledWith('notifications:reminders-blocked');
  });

  it('disables reminders and cancels notifications when toggled off', async () => {
    loadNotificationPreferences.mockReturnValue({
      remindersEnabled: true,
      dailySummaryEnabled: false,
      quietHours: [20, 23],
    });

    const { result } = renderHook(() => useNotificationSettings());

    await act(async () => {
      await result.current.toggleReminders(false);
    });

    expect(cancelAllScheduledNotifications).toHaveBeenCalled();
    expect(persistNotificationPreferences).toHaveBeenCalledWith(
      expect.objectContaining({ remindersEnabled: false }),
    );
  });
});
