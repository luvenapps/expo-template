import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { Platform } from 'react-native';

// Mock dependencies BEFORE importing the module
jest.mock('@/notifications/preferences', () => ({
  DEFAULT_NOTIFICATION_PREFERENCES: {
    pushManuallyDisabled: false,
    notificationStatus: 'unknown',
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
      pushManuallyDisabled: false,
      notificationStatus: 'unknown',
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
          pushManuallyDisabled: false,
          notificationStatus: 'granted',
          softDeclineCount: 0,
          softLastDeclinedAt: 0,
        });

        const result = await ensureNotificationsEnabled();

        expect(result).toEqual({ status: 'enabled' });
        expect(persistNotificationPreferences).not.toHaveBeenCalled();
      });

      it('returns denied when already denied', async () => {
        loadNotificationPreferences.mockReturnValue({
          pushManuallyDisabled: false,
          notificationStatus: 'denied',
          softDeclineCount: 0,
          softLastDeclinedAt: 0,
        });

        const result = await ensureNotificationsEnabled();

        expect(result).toEqual({ status: 'denied' });
        expect(persistNotificationPreferences).not.toHaveBeenCalled();
      });

      it('returns unavailable when marked unavailable', async () => {
        loadNotificationPreferences.mockReturnValue({
          pushManuallyDisabled: false,
          notificationStatus: 'unavailable',
          softDeclineCount: 0,
          softLastDeclinedAt: 0,
        });

        const result = await ensureNotificationsEnabled();

        expect(result).toEqual({ status: 'unavailable' });
        expect(persistNotificationPreferences).not.toHaveBeenCalled();
      });

      it('bypasses terminal state check when forceRegister is true', async () => {
        loadNotificationPreferences.mockReturnValue({
          pushManuallyDisabled: false,
          notificationStatus: 'granted',
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

    describe('permission request handling', () => {
      it('persists granted status and returns enabled', async () => {
        const prefs = {
          pushManuallyDisabled: false,
          notificationStatus: 'unknown' as const,
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
        });
      });

      it('persists unavailable status', async () => {
        const prefs = {
          pushManuallyDisabled: false,
          notificationStatus: 'unknown' as const,
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
        });
      });

      it('persists denied status on denial', async () => {
        const prefs = {
          pushManuallyDisabled: false,
          notificationStatus: 'unknown' as const,
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
        });
      });

      it('handles error status', async () => {
        const prefs = {
          pushManuallyDisabled: false,
          notificationStatus: 'unknown' as const,
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
