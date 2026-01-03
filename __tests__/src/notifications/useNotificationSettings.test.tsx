import { useNotificationSettings } from '@/notifications/useNotificationSettings';
import { act, renderHook } from '@testing-library/react-native';
import { AppState, Platform } from 'react-native';

jest.mock('@/notifications/preferences', () => ({
  loadNotificationPreferences: jest.fn(),
  persistNotificationPreferences: jest.fn(),
}));

jest.mock('@/notifications/firebasePush', () => ({
  registerForPushNotifications: jest.fn(),
  revokePushToken: jest.fn(),
}));

jest.mock('@/notifications/notificationSystem', () => ({
  ensureNotificationsEnabled: jest.fn(),
  revokeNotifications: jest.fn(),
}));

jest.mock('@/observability/AnalyticsProvider', () => ({
  useAnalytics: jest.fn(() => ({
    trackEvent: jest.fn(),
    trackError: jest.fn(),
    trackPerformance: jest.fn(),
  })),
}));

jest.mock('@/observability/notificationEvents', () => ({
  onNotificationEvent: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  PermissionStatus: {
    GRANTED: 'granted',
    DENIED: 'denied',
  },
  getPermissionsAsync: jest.fn(),
}));

// Create a stable t function for mocking
const mockT = jest.fn((key: string) => key);

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: {
      language: 'en',
      changeLanguage: jest.fn(),
    },
  }),
}));

const preferenceModule = require('@/notifications/preferences');
const firebasePushModule = require('@/notifications/firebasePush');
const notificationSystemModule = require('@/notifications/notificationSystem');
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
const registerForPushNotifications =
  firebasePushModule.registerForPushNotifications as jest.MockedFunction<
    typeof firebasePushModule.registerForPushNotifications
  >;
const revokePushToken = firebasePushModule.revokePushToken as jest.MockedFunction<
  typeof firebasePushModule.revokePushToken
>;
const ensureNotificationsEnabled =
  notificationSystemModule.ensureNotificationsEnabled as jest.MockedFunction<
    typeof notificationSystemModule.ensureNotificationsEnabled
  >;
const revokeNotifications = notificationSystemModule.revokeNotifications as jest.MockedFunction<
  typeof notificationSystemModule.revokeNotifications
>;
const useAnalytics = analyticsModule.useAnalytics as jest.MockedFunction<
  typeof analyticsModule.useAnalytics
>;
const getPermissionsAsync = expoNotifications.getPermissionsAsync as jest.MockedFunction<
  typeof expoNotifications.getPermissionsAsync
>;

describe('useNotificationSettings', () => {
  const originalPlatform = Platform.OS;
  const originalConsoleLog = console.log;
  const trackEvent = jest.fn();
  const trackError = jest.fn();
  let appStateSpy: jest.SpyInstance;

  beforeEach(() => {
    console.log = jest.fn();
    jest.clearAllMocks();
    mockT.mockClear();
    trackEvent.mockClear();
    trackError.mockClear();
    appStateSpy = jest
      .spyOn(AppState, 'addEventListener')
      .mockReturnValue({ remove: jest.fn() } as any);
    Object.defineProperty(Platform, 'OS', { value: 'ios' });
    useAnalytics.mockReturnValue({
      trackEvent,
      trackError,
      trackPerformance: jest.fn(),
    });
    registerForPushNotifications.mockResolvedValue({ status: 'unavailable' });
    revokePushToken.mockResolvedValue({ status: 'revoked' });
    ensureNotificationsEnabled.mockResolvedValue({ status: 'triggered', registered: false });
    revokeNotifications.mockResolvedValue({ status: 'revoked' });
    loadNotificationPreferences.mockReturnValue({
      notificationStatus: 'unknown',
      pushManuallyDisabled: false,
      softDeclineCount: 0,
      softLastDeclinedAt: 0,
    });
    getPermissionsAsync.mockResolvedValue({
      granted: false,
      status: expoNotifications.PermissionStatus.DENIED,
      canAskAgain: true,
    });
  });

  afterEach(() => {
    appStateSpy?.mockRestore();
    Object.defineProperty(Platform, 'OS', { value: originalPlatform });
    jest.useRealTimers();
    (Date.now as unknown as jest.Mock)?.mockRestore?.();
    console.log = originalConsoleLog;
  });

  it('loads preferences and evaluates permission status on mount', async () => {
    const { result } = renderHook(() => useNotificationSettings());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.permissionStatus).toBe('denied');
  });

  it('sets isSupported based on platform', async () => {
    // Platform.OS is evaluated at module load time, so we test the current platform
    const { result } = renderHook(() => useNotificationSettings());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // On iOS (the test platform), isSupported should be true
    expect(result.current.isSupported).toBe(true);
  });

  it('handles permission check errors gracefully', async () => {
    getPermissionsAsync.mockRejectedValue(new Error('Permission check failed'));

    const { result } = renderHook(() => useNotificationSettings());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.permissionStatus).toBe('unavailable');
    expect(trackError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ source: 'notifications:permissions' }),
    );
  });

  it('does not auto-register when permission granted but push manually disabled', async () => {
    loadNotificationPreferences.mockReturnValue({
      notificationStatus: 'unknown',
      pushManuallyDisabled: true, // User manually disabled push
      softDeclineCount: 0,
      softLastDeclinedAt: 0,
    });

    getPermissionsAsync.mockResolvedValue({
      granted: true,
      status: expoNotifications.PermissionStatus.GRANTED,
      canAskAgain: true,
    });

    const { result } = renderHook(() => useNotificationSettings());

    await act(async () => {
      await Promise.resolve();
    });

    // Should not auto-register when user manually disabled push
    expect(ensureNotificationsEnabled).not.toHaveBeenCalled();
    expect(result.current.notificationStatus).toBe('unknown');
  });

  it('avoids auto-registration when permission stays granted and push manually disabled', async () => {
    loadNotificationPreferences.mockReturnValue({
      notificationStatus: 'unknown',
      pushManuallyDisabled: true, // User manually disabled push
      softDeclineCount: 0,
      softLastDeclinedAt: 0,
    });

    getPermissionsAsync.mockResolvedValue({
      granted: true,
      status: expoNotifications.PermissionStatus.GRANTED,
      canAskAgain: true,
    });

    const { result } = renderHook(() => useNotificationSettings());

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.refreshPermissionStatus();
    });

    expect(ensureNotificationsEnabled).not.toHaveBeenCalled();
  });

  it('maps granted permission status correctly', async () => {
    getPermissionsAsync.mockResolvedValue({
      granted: true,
      status: expoNotifications.PermissionStatus.GRANTED,
      canAskAgain: false,
    });

    const { result } = renderHook(() => useNotificationSettings());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.permissionStatus).toBe('granted');
  });

  it('maps blocked permission status when denied and cannot ask again', async () => {
    getPermissionsAsync.mockResolvedValue({
      granted: false,
      status: expoNotifications.PermissionStatus.DENIED,
      canAskAgain: false,
    });

    const { result } = renderHook(() => useNotificationSettings());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.permissionStatus).toBe('blocked');
  });

  it('maps prompt status for undetermined permissions', async () => {
    getPermissionsAsync.mockResolvedValue({
      granted: false,
      status: 'undetermined' as any,
      canAskAgain: true,
    });

    const { result } = renderHook(() => useNotificationSettings());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.permissionStatus).toBe('prompt');
  });

  it('allows prompting for push when under limits', async () => {
    // Mock permission as prompt so useEffect doesn't interfere
    getPermissionsAsync.mockResolvedValue({
      granted: false,
      status: 'undetermined' as any,
      canAskAgain: true,
    });

    // Mock ensureNotificationsEnabled to simulate the real behavior:
    // it persists preferences with notificationStatus='granted' when enabled
    ensureNotificationsEnabled.mockImplementation(async () => {
      const prefs = loadNotificationPreferences();
      persistNotificationPreferences({
        ...prefs,
        notificationStatus: 'granted',
        pushManuallyDisabled: false,
      });
      return { status: 'enabled' };
    });

    // Update loadNotificationPreferences to return updated state after persistence
    loadNotificationPreferences.mockReturnValue({
      notificationStatus: 'granted',
      pushManuallyDisabled: false,
      softDeclineCount: 0,
      softLastDeclinedAt: 0,
    });

    const { result } = renderHook(() => useNotificationSettings());

    // Wait for initial effects to settle (auto-soft prompt may trigger)
    await act(async () => {
      await Promise.resolve();
    });

    expect(typeof result.current.tryPromptForPush).toBe('function');

    // Clear mock calls from auto-soft prompt
    jest.clearAllMocks();

    await act(async () => {
      await result.current.tryPromptForPush({ skipSoftPrompt: true });
    });

    expect(ensureNotificationsEnabled).toHaveBeenCalled();
    expect(persistNotificationPreferences).toHaveBeenCalled();

    const lastCall =
      persistNotificationPreferences.mock.calls[
        persistNotificationPreferences.mock.calls.length - 1
      ][0];
    expect(lastCall).toMatchObject({
      notificationStatus: 'granted',
      pushManuallyDisabled: false,
      softDeclineCount: 0,
      softLastDeclinedAt: 0,
    });
    expect(trackEvent).toHaveBeenCalledWith('notifications:prompt-triggered', {
      context: 'manual',
    });
  });

  it('returns denied when OS permission is blocked even if flag was enabled', async () => {
    getPermissionsAsync.mockResolvedValue({
      granted: false,
      status: expoNotifications.PermissionStatus.DENIED,
      canAskAgain: false,
    });
    loadNotificationPreferences.mockReturnValue({
      notificationStatus: 'granted',
      pushManuallyDisabled: false,
      softDeclineCount: 0,
      softLastDeclinedAt: 0,
    });

    ensureNotificationsEnabled.mockResolvedValue({ status: 'denied' });

    const { result } = renderHook(() => useNotificationSettings());

    await act(async () => {
      await result.current.refreshPermissionStatus();
    });

    expect(result.current.permissionStatus).toBe('blocked');
    const res = await act(async () => result.current.tryPromptForPush({ context: 'manual' }));
    expect(res.status).toBe('denied');
  });

  it('handles push denial', async () => {
    // Mock permission as prompt so useEffect doesn't interfere
    getPermissionsAsync.mockResolvedValue({
      granted: false,
      status: 'undetermined' as any,
      canAskAgain: true,
    });

    // Mock ensureNotificationsEnabled to simulate denial behavior
    ensureNotificationsEnabled.mockImplementation(async () => {
      const prefs = loadNotificationPreferences();
      persistNotificationPreferences({
        ...prefs,
        notificationStatus: 'denied',
        pushManuallyDisabled: false,
      });
      return { status: 'denied' };
    });

    const { result } = renderHook(() => useNotificationSettings());

    // Wait for initial effects to settle (auto-soft prompt may trigger)
    await act(async () => {
      await Promise.resolve();
    });

    // Clear mock calls from auto-soft prompt
    jest.clearAllMocks();

    await act(async () => {
      await result.current.tryPromptForPush({ skipSoftPrompt: true });
    });

    const lastCall =
      persistNotificationPreferences.mock.calls[
        persistNotificationPreferences.mock.calls.length - 1
      ][0];
    expect(lastCall).toMatchObject({
      notificationStatus: 'denied',
      pushManuallyDisabled: false,
      softDeclineCount: 0,
      softLastDeclinedAt: 0,
    });
    expect(trackEvent).toHaveBeenCalledWith('notifications:prompt-triggered', {
      context: 'manual',
    });
  });

  it('disables push notifications and revokes token', async () => {
    revokeNotifications.mockResolvedValue({ status: 'revoked' });
    const { result } = renderHook(() => useNotificationSettings());

    await act(async () => {
      await result.current.disablePushNotifications();
    });

    expect(revokeNotifications).toHaveBeenCalled();
    expect(persistNotificationPreferences).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationStatus: 'unknown',
        pushManuallyDisabled: true, // Set to true when manually disabling
        softDeclineCount: 0,
        softLastDeclinedAt: 0,
      }),
    );
  });

  it('handles revoke errors gracefully', async () => {
    revokeNotifications.mockResolvedValue({ status: 'error', message: 'fail' });
    const { result } = renderHook(() => useNotificationSettings());

    await act(async () => {
      await result.current.disablePushNotifications();
    });

    expect(result.current.pushError).toBeNull();
  });

  describe('tryPromptForPush', () => {
    it('triggers prompt when no attempts made yet', async () => {
      // Mock permission as prompt so early return doesn't trigger
      getPermissionsAsync.mockResolvedValue({
        granted: false,
        status: 'undetermined' as any,
        canAskAgain: true,
      });
      ensureNotificationsEnabled.mockResolvedValue({ status: 'enabled' });

      const { result } = renderHook(() => useNotificationSettings());

      // Wait for initial permission check
      await act(async () => {
        await Promise.resolve();
      });

      let promptResult;
      await act(async () => {
        promptResult = await result.current.tryPromptForPush({
          context: 'entry-created',
          skipSoftPrompt: true,
        });
      });

      expect(trackEvent).toHaveBeenCalledWith('notifications:prompt-triggered', {
        context: 'entry-created',
      });
      expect(ensureNotificationsEnabled).toHaveBeenCalled();
      expect(promptResult).toEqual({ status: 'triggered', registered: true });
    });

    it('returns already-enabled when push already enabled', async () => {
      loadNotificationPreferences.mockReturnValue({
        notificationStatus: 'granted',
        pushManuallyDisabled: false,
        softDeclineCount: 0,
        softLastDeclinedAt: 0,
      });

      // Mock permission as granted so early return doesn't trigger
      getPermissionsAsync.mockResolvedValue({
        granted: true,
        status: expoNotifications.PermissionStatus.GRANTED,
        canAskAgain: false,
      });
      // When status is 'already-enabled', ensureNotificationsEnabled returns this
      ensureNotificationsEnabled.mockResolvedValue({ status: 'already-enabled' });

      const { result } = renderHook(() => useNotificationSettings());

      // Wait for initial permission check
      await act(async () => {
        await Promise.resolve();
      });

      let promptResult;
      await act(async () => {
        promptResult = await result.current.tryPromptForPush({ context: 'manual' });
      });

      expect(promptResult).toEqual({ status: 'already-enabled' });
      expect(registerForPushNotifications).not.toHaveBeenCalled();
    });

    it('returns denied when push previously denied', async () => {
      loadNotificationPreferences.mockReturnValue({
        notificationStatus: 'denied',
        pushManuallyDisabled: false,
        softDeclineCount: 0,
        softLastDeclinedAt: 0,
      });

      ensureNotificationsEnabled.mockResolvedValue({ status: 'denied' });

      const { result } = renderHook(() => useNotificationSettings());

      let promptResult;
      await act(async () => {
        promptResult = await result.current.tryPromptForPush({ context: 'entry-created' });
      });

      expect(promptResult).toEqual({ status: 'denied' });
      expect(registerForPushNotifications).not.toHaveBeenCalled();
    });

    it('returns unavailable when push notifications not configured', async () => {
      // Mock permission as prompt so early return doesn't trigger
      getPermissionsAsync.mockResolvedValue({
        granted: false,
        status: 'undetermined' as any,
        canAskAgain: true,
      });
      ensureNotificationsEnabled.mockResolvedValue({ status: 'unavailable' });

      const { result } = renderHook(() => useNotificationSettings());

      // Wait for initial permission check
      await act(async () => {
        await Promise.resolve();
      });

      let promptResult;
      await act(async () => {
        promptResult = await result.current.tryPromptForPush({
          context: 'manual',
          skipSoftPrompt: true,
        });
      });

      expect(promptResult).toEqual({ status: 'unavailable' });
    });

    it('returns error when registration fails', async () => {
      // Mock permission as prompt so early return doesn't trigger
      getPermissionsAsync.mockResolvedValue({
        granted: false,
        status: 'undetermined' as any,
        canAskAgain: true,
      });
      ensureNotificationsEnabled.mockResolvedValue({ status: 'error', message: 'Network error' });

      const { result } = renderHook(() => useNotificationSettings());

      // Wait for initial permission check
      await act(async () => {
        await Promise.resolve();
      });

      let promptResult;
      await act(async () => {
        promptResult = await result.current.tryPromptForPush({
          context: 'entry-created',
          skipSoftPrompt: true,
        });
      });

      expect(promptResult).toEqual({ status: 'error', message: 'Network error' });
    });

    it('tracks analytics with context on every call', async () => {
      // Mock permission as prompt so early return doesn't trigger
      getPermissionsAsync.mockResolvedValue({
        granted: false,
        status: 'undetermined' as any,
        canAskAgain: true,
      });
      const { result } = renderHook(() => useNotificationSettings());

      // Wait for initial permission check
      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        await result.current.tryPromptForPush({ context: 'entry-created', skipSoftPrompt: true });
      });

      expect(trackEvent).toHaveBeenCalledWith('notifications:prompt-triggered', {
        context: 'entry-created',
      });
    });

    it('defaults context to manual when not provided', async () => {
      loadNotificationPreferences.mockReturnValue({
        notificationStatus: 'unknown',
        pushManuallyDisabled: false,
        softDeclineCount: 0,
        softLastDeclinedAt: 0,
      });

      // Mock permission as prompt so tryPromptForPush can proceed
      getPermissionsAsync.mockResolvedValue({
        granted: false,
        status: 'undetermined' as any,
        canAskAgain: true,
      });

      const { result } = renderHook(() => useNotificationSettings());

      // Wait for initial permission check
      await act(async () => {
        await Promise.resolve();
      });

      // Clear mock calls from auto-soft prompt
      jest.clearAllMocks();

      await act(async () => {
        await result.current.tryPromptForPush({ skipSoftPrompt: true });
      });

      // Verify that context defaults to manual when not provided
      expect(trackEvent).toHaveBeenCalledWith('notifications:prompt-triggered', {
        context: 'manual',
      });
    });
  });
});
