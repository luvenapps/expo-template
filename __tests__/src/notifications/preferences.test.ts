import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { Platform } from 'react-native';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  clearNotificationPreferences,
  loadNotificationPreferences,
  persistNotificationPreferences,
} from '@/notifications/preferences';

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));

describe('preferences', () => {
  const originalPlatform = Platform.OS;
  let mockLocalStorage: any;
  let mockMMKV: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock localStorage for web
    mockLocalStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
      key: jest.fn(),
      length: 0,
    };

    // Mock MMKV for native
    const MMKVModule = require('react-native-mmkv');
    mockMMKV = {
      getString: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };
    MMKVModule.MMKV.mockImplementation(() => mockMMKV);

    // Setup globalThis.localStorage
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      value: originalPlatform,
      configurable: true,
    });
  });

  describe('loadNotificationPreferences', () => {
    it('returns default preferences when no data exists on web', () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
      (mockLocalStorage.getItem as jest.Mock).mockReturnValue(null);

      const result = loadNotificationPreferences();

      expect(result).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
    });

    it('returns default preferences when no data exists on native', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
      mockMMKV.getString.mockReturnValue(null);

      const result = loadNotificationPreferences();

      expect(result).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
    });

    it('loads stored preferences from localStorage on web', () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
      const stored = {
        pushOptInStatus: 'unknown',
        pushPromptAttempts: 0,
        pushLastPromptAt: 0,
        pushToken: null,
      };
      (mockLocalStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(stored));

      const result = loadNotificationPreferences();

      // loadNotificationPreferences migrates old format to new format
      expect(result).toMatchObject({
        notificationStatus: 'unknown', // migrated from pushOptInStatus
        pushManuallyDisabled: false,
        softDeclineCount: 0,
        softLastDeclinedAt: 0,
      });
    });

    it('migrates legacy data and preserves manual disable flag', () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
      const stored = {
        pushOptInStatus: 'denied',
        pushPromptAttempts: 2,
        pushLastPromptAt: 123,
        pushManuallyDisabled: true,
      };
      (mockLocalStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(stored));

      const result = loadNotificationPreferences();

      expect(result.pushManuallyDisabled).toBe(true);
      expect(result.notificationStatus).toBe('denied');
    });

    it('maps legacy enabled/unavailable statuses when notificationStatus is missing', () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
      (mockLocalStorage.getItem as jest.Mock).mockReturnValue(
        JSON.stringify({ pushOptInStatus: 'enabled' }),
      );

      const enabledResult = loadNotificationPreferences();
      expect(enabledResult.notificationStatus).toBe('granted');

      (mockLocalStorage.getItem as jest.Mock).mockReturnValue(
        JSON.stringify({ pushOptInStatus: 'unavailable' }),
      );
      const unavailableResult = loadNotificationPreferences();
      expect(unavailableResult.notificationStatus).toBe('unavailable');
    });

    it('prefers explicit notificationStatus over legacy fields', () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
      (mockLocalStorage.getItem as jest.Mock).mockReturnValue(
        JSON.stringify({ notificationStatus: 'granted', pushOptInStatus: 'denied' }),
      );

      const result = loadNotificationPreferences();

      expect(result.notificationStatus).toBe('granted');
    });

    it('loads stored preferences from MMKV on native', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
      const stored = {
        pushOptInStatus: 'unknown',
        pushPromptAttempts: 0,
        pushLastPromptAt: 0,
        pushToken: null,
      };
      mockMMKV.getString.mockReturnValue(JSON.stringify(stored));

      const result = loadNotificationPreferences();

      // loadNotificationPreferences migrates old format to new format
      expect(result).toMatchObject({
        notificationStatus: 'unknown', // migrated from pushOptInStatus
        pushManuallyDisabled: false,
        softDeclineCount: 0,
        softLastDeclinedAt: 0,
      });
    });

    it('merges partial stored data with defaults', () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
      const partial = { pushManuallyDisabled: true };
      (mockLocalStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(partial));

      const result = loadNotificationPreferences();

      expect(result).toEqual({
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        pushManuallyDisabled: true,
      });
    });

    it('returns defaults when JSON parsing fails', () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
      (mockLocalStorage.getItem as jest.Mock).mockReturnValue('invalid json');

      const result = loadNotificationPreferences();

      expect(result).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
    });

    it('handles missing localStorage on web', () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
      Object.defineProperty(globalThis, 'localStorage', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const result = loadNotificationPreferences();

      expect(result).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
    });

    it('handles MMKV initialization error on native', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
      const MMKVModule = require('react-native-mmkv');
      MMKVModule.MMKV.mockImplementation(() => {
        throw new Error('MMKV init failed');
      });

      const result = loadNotificationPreferences();

      expect(result).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
    });
  });

  describe('persistNotificationPreferences', () => {
    it('persists to localStorage on web', () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
      const preferences = {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
      };

      persistNotificationPreferences(preferences);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        expect.any(String),
        JSON.stringify(preferences),
      );
    });

    it('persists to MMKV on native', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
      const preferences = {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
      };

      persistNotificationPreferences(preferences);

      expect(mockMMKV.set).toHaveBeenCalledWith(expect.any(String), JSON.stringify(preferences));
    });

    it('handles missing localStorage on web gracefully', () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
      // Delete localStorage to simulate missing environment
      const originalLocalStorage = globalThis.localStorage;
      delete (globalThis as any).localStorage;

      const preferences = {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
      };

      expect(() => persistNotificationPreferences(preferences)).not.toThrow();

      // Restore localStorage
      Object.defineProperty(globalThis, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
        configurable: true,
      });
    });

    it('handles MMKV initialization error on native', () => {
      Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
      const MMKVModule = require('react-native-mmkv');
      MMKVModule.MMKV.mockImplementation(() => {
        throw new Error('MMKV init failed');
      });
      const preferences = {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
      };

      expect(() => persistNotificationPreferences(preferences)).not.toThrow();
    });
  });

  describe('clearNotificationPreferences', () => {
    it('removes stored preferences from localStorage on web', () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });

      clearNotificationPreferences();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(expect.any(String));
    });

    it('removes stored preferences from MMKV on native', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });

      clearNotificationPreferences();

      expect(mockMMKV.delete).toHaveBeenCalledWith(expect.any(String));
    });

    it('handles missing localStorage on web gracefully', () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
      const originalLocalStorage = globalThis.localStorage;
      delete (globalThis as any).localStorage;

      expect(() => clearNotificationPreferences()).not.toThrow();

      Object.defineProperty(globalThis, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
        configurable: true,
      });
    });
  });
});
