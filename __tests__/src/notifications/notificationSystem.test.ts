import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { Platform } from 'react-native';
import { NOTIFICATIONS } from '@/config/constants';

// Mock dependencies BEFORE importing the module
jest.mock('@/notifications/preferences', () => ({
  DEFAULT_NOTIFICATION_PREFERENCES: {
    remindersEnabled: false,
    dailySummaryEnabled: false,
    quietHours: [0, 0] as [number, number],
    pushManuallyDisabled: false,
    notificationStatus: 'unknown',
    osPromptAttempts: 0,
    osLastPromptAt: 0,
    softDeclineCount: 0,
    softLastDeclinedAt: 0,
  },
  loadNotificationPreferences: jest.fn(),
  persistNotificationPreferences: jest.fn(),
}));

jest.mock('@/notifications/notificationPlatform.web');
jest.mock('@/notifications/notificationPlatform.native');

const preferencesModule = require('@/notifications/preferences');
const webPlatform = require('@/notifications/notificationPlatform.web');

const loadNotificationPreferences =
  preferencesModule.loadNotificationPreferences as jest.MockedFunction<
    typeof preferencesModule.loadNotificationPreferences
  >;
const persistNotificationPreferences =
  preferencesModule.persistNotificationPreferences as jest.MockedFunction<
    typeof preferencesModule.persistNotificationPreferences
  >;
const mockWebRequestPermission = webPlatform.requestPermission as jest.MockedFunction<any>;
const mockWebRevokePermission = webPlatform.revokePermission as jest.MockedFunction<any>;

// Set platform to web for initial import
Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });

// Import after platform is set
const {
  ensureNotificationsEnabled,
  revokeNotifications,
} = require('@/notifications/notificationSystem');

describe('notificationSystem', () => {
  let mockNow: number;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNow = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(mockNow);

    // Default mock returns
    loadNotificationPreferences.mockReturnValue({
      remindersEnabled: false,
      dailySummaryEnabled: false,
      quietHours: [0, 0],
      pushManuallyDisabled: false,
      notificationStatus: 'unknown',
      osPromptAttempts: 0,
      osLastPromptAt: 0,
      softDeclineCount: 0,
      softLastDeclinedAt: 0,
    });
  });

  afterEach(() => {
    (Date.now as unknown as jest.Mock)?.mockRestore?.();
  });

  describe('ensureNotificationsEnabled', () => {
    describe('early returns for terminal states', () => {
      it('returns enabled when already granted', async () => {
        loadNotificationPreferences.mockReturnValue({
          remindersEnabled: false,
          dailySummaryEnabled: false,
          quietHours: [0, 0],
          pushManuallyDisabled: false,
          notificationStatus: 'granted',
          osPromptAttempts: 0,
          osLastPromptAt: 0,
          softDeclineCount: 0,
          softLastDeclinedAt: 0,
        });

        const result = await ensureNotificationsEnabled();

        expect(result).toEqual({ status: 'enabled' });
        expect(persistNotificationPreferences).not.toHaveBeenCalled();
      });

      it('returns denied when already denied', async () => {
        loadNotificationPreferences.mockReturnValue({
          remindersEnabled: false,
          dailySummaryEnabled: false,
          quietHours: [0, 0],
          pushManuallyDisabled: false,
          notificationStatus: 'denied',
          osPromptAttempts: 1,
          osLastPromptAt: mockNow - 1000,
          softDeclineCount: 0,
          softLastDeclinedAt: 0,
        });

        const result = await ensureNotificationsEnabled();

        expect(result).toEqual({ status: 'denied' });
        expect(persistNotificationPreferences).not.toHaveBeenCalled();
      });

      it('returns unavailable when marked unavailable', async () => {
        loadNotificationPreferences.mockReturnValue({
          remindersEnabled: false,
          dailySummaryEnabled: false,
          quietHours: [0, 0],
          pushManuallyDisabled: false,
          notificationStatus: 'unavailable',
          osPromptAttempts: 0,
          osLastPromptAt: 0,
          softDeclineCount: 0,
          softLastDeclinedAt: 0,
        });

        const result = await ensureNotificationsEnabled();

        expect(result).toEqual({ status: 'unavailable' });
        expect(persistNotificationPreferences).not.toHaveBeenCalled();
      });

      it('bypasses terminal state check when forceRegister is true', async () => {
        loadNotificationPreferences.mockReturnValue({
          remindersEnabled: false,
          dailySummaryEnabled: false,
          quietHours: [0, 0],
          pushManuallyDisabled: false,
          notificationStatus: 'granted',
          osPromptAttempts: 0,
          osLastPromptAt: 0,
          softDeclineCount: 0,
          softLastDeclinedAt: 0,
        });
        mockWebRequestPermission.mockResolvedValue({ status: 'granted', token: 'new-token' });

        const result = await ensureNotificationsEnabled({ forceRegister: true });

        expect(result).toEqual({ status: 'enabled' });
        expect(mockWebRequestPermission).toHaveBeenCalled();
        expect(persistNotificationPreferences).toHaveBeenCalled();
      });
    });

    describe('attempt exhaustion and cooldown', () => {
      it('returns exhausted when max attempts reached', async () => {
        loadNotificationPreferences.mockReturnValue({
          remindersEnabled: false,
          dailySummaryEnabled: false,
          quietHours: [0, 0],
          pushManuallyDisabled: false,
          notificationStatus: 'unknown',
          osPromptAttempts: NOTIFICATIONS.osPromptMaxAttempts,
          osLastPromptAt: mockNow - 1000,
          softDeclineCount: 0,
          softLastDeclinedAt: 0,
        });

        const result = await ensureNotificationsEnabled();

        expect(result).toEqual({ status: 'exhausted' });
        expect(persistNotificationPreferences).not.toHaveBeenCalled();
      });

      it('returns cooldown when in cooldown period', async () => {
        const lastPromptAt = mockNow - 1000; // 1 second ago
        loadNotificationPreferences.mockReturnValue({
          remindersEnabled: false,
          dailySummaryEnabled: false,
          quietHours: [0, 0],
          pushManuallyDisabled: false,
          notificationStatus: 'unknown',
          osPromptAttempts: 1,
          osLastPromptAt: lastPromptAt,
          softDeclineCount: 0,
          softLastDeclinedAt: 0,
        });

        const result = await ensureNotificationsEnabled();

        expect(result).toHaveProperty('status', 'cooldown');
        expect(result).toHaveProperty('remainingDays');
        if ('remainingDays' in result) {
          expect(result.remainingDays).toBeGreaterThan(0);
        }
        expect(persistNotificationPreferences).not.toHaveBeenCalled();
      });

      it('bypasses cooldown and exhaustion when forceRegister is true', async () => {
        loadNotificationPreferences.mockReturnValue({
          remindersEnabled: false,
          dailySummaryEnabled: false,
          quietHours: [0, 0],
          pushManuallyDisabled: false,
          notificationStatus: 'unknown',
          osPromptAttempts: NOTIFICATIONS.osPromptMaxAttempts,
          osLastPromptAt: mockNow - 1000,
          softDeclineCount: 0,
          softLastDeclinedAt: 0,
        });
        mockWebRequestPermission.mockResolvedValue({ status: 'granted', token: 'token' });

        const result = await ensureNotificationsEnabled({ forceRegister: true });

        expect(result).toEqual({ status: 'enabled' });
        expect(mockWebRequestPermission).toHaveBeenCalled();
      });
    });

    describe('permission request handling', () => {
      it('persists granted status and returns enabled', async () => {
        const prefs = {
          remindersEnabled: false,
          dailySummaryEnabled: false,
          quietHours: [0, 0] as [number, number],
          pushManuallyDisabled: false,
          notificationStatus: 'unknown' as const,
          osPromptAttempts: 0,
          osLastPromptAt: 0,
          softDeclineCount: 0,
          softLastDeclinedAt: 0,
        };
        loadNotificationPreferences.mockReturnValue(prefs);
        mockWebRequestPermission.mockResolvedValue({ status: 'granted', token: 'web-token' });

        const result = await ensureNotificationsEnabled();

        expect(result).toEqual({ status: 'enabled' });
        expect(persistNotificationPreferences).toHaveBeenCalledWith({
          ...prefs,
          notificationStatus: 'granted',
          pushManuallyDisabled: false,
          osPromptAttempts: 0,
          osLastPromptAt: mockNow,
        });
      });

      it('persists unavailable status', async () => {
        const prefs = {
          remindersEnabled: false,
          dailySummaryEnabled: false,
          quietHours: [0, 0] as [number, number],
          pushManuallyDisabled: false,
          notificationStatus: 'unknown' as const,
          osPromptAttempts: 0,
          osLastPromptAt: 0,
          softDeclineCount: 0,
          softLastDeclinedAt: 0,
        };
        loadNotificationPreferences.mockReturnValue(prefs);
        mockWebRequestPermission.mockResolvedValue({
          status: 'unavailable',
          message: 'Push not supported',
        });

        const result = await ensureNotificationsEnabled();

        expect(result).toEqual({ status: 'unavailable', message: 'Push not supported' });
        expect(persistNotificationPreferences).toHaveBeenCalledWith({
          ...prefs,
          notificationStatus: 'unavailable',
          osLastPromptAt: mockNow,
        });
      });

      it('persists denied status and increments attempts on denial', async () => {
        const prefs = {
          remindersEnabled: false,
          dailySummaryEnabled: false,
          quietHours: [0, 0] as [number, number],
          pushManuallyDisabled: false,
          notificationStatus: 'unknown' as const,
          osPromptAttempts: 0,
          osLastPromptAt: 0,
          softDeclineCount: 0,
          softLastDeclinedAt: 0,
        };
        loadNotificationPreferences.mockReturnValue(prefs);
        mockWebRequestPermission.mockResolvedValue({ status: 'denied' });

        const result = await ensureNotificationsEnabled();

        expect(result).toEqual({ status: 'denied', message: undefined });
        expect(persistNotificationPreferences).toHaveBeenCalledWith({
          ...prefs,
          notificationStatus: 'denied',
          pushManuallyDisabled: false,
          osPromptAttempts: 1,
          osLastPromptAt: mockNow,
        });
      });

      it('handles error status', async () => {
        const prefs = {
          remindersEnabled: false,
          dailySummaryEnabled: false,
          quietHours: [0, 0] as [number, number],
          pushManuallyDisabled: false,
          notificationStatus: 'unknown' as const,
          osPromptAttempts: 0,
          osLastPromptAt: 0,
          softDeclineCount: 0,
          softLastDeclinedAt: 0,
        };
        loadNotificationPreferences.mockReturnValue(prefs);
        mockWebRequestPermission.mockResolvedValue({
          status: 'error',
          message: 'Service worker failed',
        });

        const result = await ensureNotificationsEnabled();

        expect(result).toEqual({ status: 'error', message: 'Service worker failed' });
        expect(persistNotificationPreferences).toHaveBeenCalledWith({
          ...prefs,
          notificationStatus: 'denied',
          pushManuallyDisabled: false,
          osPromptAttempts: 1,
          osLastPromptAt: mockNow,
        });
      });

      it('sets osLastPromptAt to 0 when forceRegister is true', async () => {
        const prefs = {
          remindersEnabled: false,
          dailySummaryEnabled: false,
          quietHours: [0, 0] as [number, number],
          pushManuallyDisabled: false,
          notificationStatus: 'unknown' as const,
          osPromptAttempts: 2,
          osLastPromptAt: 12345,
          softDeclineCount: 0,
          softLastDeclinedAt: 0,
        };
        loadNotificationPreferences.mockReturnValue(prefs);
        mockWebRequestPermission.mockResolvedValue({ status: 'granted', token: 'token' });

        await ensureNotificationsEnabled({ forceRegister: true });

        expect(persistNotificationPreferences).toHaveBeenCalledWith({
          ...prefs,
          notificationStatus: 'granted',
          pushManuallyDisabled: false,
          osPromptAttempts: 0,
          osLastPromptAt: 0, // Reset when forceRegister
        });
      });
    });
  });

  describe('revokeNotifications', () => {
    it('calls platform revoke and resets preferences', async () => {
      mockWebRevokePermission.mockResolvedValue(undefined);

      await revokeNotifications();

      expect(mockWebRevokePermission).toHaveBeenCalled();
      expect(persistNotificationPreferences).toHaveBeenCalledWith({
        ...preferencesModule.DEFAULT_NOTIFICATION_PREFERENCES,
        notificationStatus: 'unknown',
      });
    });
  });
});
