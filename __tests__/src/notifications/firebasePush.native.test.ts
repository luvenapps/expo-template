import { Platform } from 'react-native';

jest.mock('@react-native-firebase/messaging', () => {
  const AuthorizationStatus = {
    AUTHORIZED: 1,
    PROVISIONAL: 2,
    DENIED: 3,
  };
  const requestPermission = jest.fn().mockResolvedValue(AuthorizationStatus.AUTHORIZED);
  const getToken = jest.fn().mockResolvedValue('mock-token');
  const deleteToken = jest.fn().mockResolvedValue(undefined);
  const registerDeviceForRemoteMessages = jest.fn().mockResolvedValue(undefined);
  let onMessageCallback: ((msg: any) => void) | null = null;
  let onTokenRefreshCallback: ((token: string) => void) | null = null;
  const onMessage = jest.fn((cb: (msg: any) => void) => {
    onMessageCallback = cb;
    return jest.fn();
  });
  const onTokenRefresh = jest.fn((cb: (token: string) => void) => {
    onTokenRefreshCallback = cb;
    return jest.fn();
  });
  const setBackgroundMessageHandler = jest.fn((cb: (msg: any) => void) => {
    onMessageCallback = cb;
  });

  return {
    __esModule: true,
    default: jest.fn(() => ({
      requestPermission,
      getToken,
      deleteToken,
      registerDeviceForRemoteMessages,
      onMessage,
      onTokenRefresh,
      setBackgroundMessageHandler,
    })),
    __mock: {
      requestPermission,
      getToken,
      deleteToken,
      registerDeviceForRemoteMessages,
      onMessage,
      onTokenRefresh,
      setBackgroundMessageHandler,
      getOnMessageCallback: () => onMessageCallback,
      getOnTokenRefreshCallback: () => onTokenRefreshCallback,
      reset: () => {
        onMessageCallback = null;
        onTokenRefreshCallback = null;
        requestPermission.mockReset();
        getToken.mockReset();
        deleteToken.mockReset();
        registerDeviceForRemoteMessages.mockReset();
        onMessage.mockReset();
        onTokenRefresh.mockReset();
        setBackgroundMessageHandler.mockReset();
        requestPermission.mockResolvedValue(AuthorizationStatus.AUTHORIZED);
        getToken.mockResolvedValue('mock-token');
        deleteToken.mockResolvedValue(undefined);
        registerDeviceForRemoteMessages.mockResolvedValue(undefined);
        onMessage.mockImplementation((cb: (msg: any) => void) => {
          onMessageCallback = cb;
          return jest.fn();
        });
        onTokenRefresh.mockImplementation((cb: (token: string) => void) => {
          onTokenRefreshCallback = cb;
          return jest.fn();
        });
        setBackgroundMessageHandler.mockImplementation((cb: (msg: any) => void) => {
          onMessageCallback = cb;
        });
      },
    },
    AuthorizationStatus,
  };
});

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({
    granted: true,
    status: 'granted',
    canAskAgain: true,
  }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({
    granted: true,
    status: 'granted',
    canAskAgain: true,
  }),
  PermissionStatus: {
    GRANTED: 'granted',
    DENIED: 'denied',
    UNDETERMINED: 'undetermined',
  },
}));

describe('firebasePush Native', () => {
  const originalPlatform = Platform.OS;
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;
  const originalConsoleDebug = console.debug;
  const originalConsoleError = console.error;
  const originalConsoleInfo = console.info;
  const originalEnvFlag = process.env.EXPO_PUBLIC_TURN_ON_FIREBASE;
  const loadFreshFirebasePush = () => {
    let module = null as unknown as typeof import('@/notifications/firebasePush');
    jest.isolateModules(() => {
      module =
        require('@/notifications/firebasePush') as typeof import('@/notifications/firebasePush');
    });
    return module;
  };

  beforeAll(() => {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.debug = jest.fn();
    console.error = jest.fn();
    console.info = jest.fn();
  });

  afterAll(() => {
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.debug = originalConsoleDebug;
    console.error = originalConsoleError;
    console.info = originalConsoleInfo;
  });

  beforeEach(() => {
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = 'true';
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });

    // Reset module cache first to clear lastLoggedNativeToken and other module-level state
    jest.resetModules();

    // Now reset the mocks after module reset
    const messaging = jest.requireMock('@react-native-firebase/messaging');
    messaging.__mock.reset();
    const Notifications = jest.requireMock('expo-notifications');
    Notifications.scheduleNotificationAsync.mockClear();
    Notifications.scheduleNotificationAsync.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = originalEnvFlag;
    Object.defineProperty(Platform, 'OS', { value: originalPlatform, configurable: true });
  });

  it('returns unavailable on web', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    const { registerForPushNotifications } = require('@/notifications/firebasePush');
    const result = await registerForPushNotifications();
    expect(result.status).toBe('unavailable');
  });

  it('registers and returns token on native when authorized', async () => {
    const { registerForPushNotifications } = require('@/notifications/firebasePush');
    const messaging = jest.requireMock('@react-native-firebase/messaging');
    const result = await registerForPushNotifications();
    expect(result).toEqual({ status: 'registered', token: 'mock-token' });
    expect(messaging.__mock.registerDeviceForRemoteMessages).toHaveBeenCalled();
  });

  it('returns denied when permission not granted', async () => {
    const { registerForPushNotifications } = require('@/notifications/firebasePush');
    const messaging = jest.requireMock('@react-native-firebase/messaging');
    // Clear previous mock and configure for denial
    messaging.__mock.requestPermission.mockClear();
    messaging.__mock.requestPermission.mockResolvedValue(messaging.AuthorizationStatus.DENIED);

    const result = await registerForPushNotifications();
    expect(result.status).toBe('denied');
  });

  it('returns error on exception', async () => {
    const { registerForPushNotifications } = require('@/notifications/firebasePush');
    const messaging = jest.requireMock('@react-native-firebase/messaging');
    // Clear previous mock and configure for error
    messaging.__mock.requestPermission.mockClear();
    messaging.__mock.requestPermission.mockRejectedValue(new Error('boom'));

    const result = await registerForPushNotifications();
    expect(result.status).toBe('error');
  });

  it('revokes token when enabled', async () => {
    const { revokePushToken } = require('@/notifications/firebasePush');
    const messaging = jest.requireMock('@react-native-firebase/messaging');
    const result = await revokePushToken();
    expect(result.status).toBe('revoked');
    expect(messaging.__mock.deleteToken).toHaveBeenCalled();
  });

  it('returns error when revoke fails', async () => {
    const { revokePushToken } = require('@/notifications/firebasePush');
    const messaging = jest.requireMock('@react-native-firebase/messaging');
    messaging.__mock.deleteToken.mockRejectedValue(new Error('fail'));
    const result = await revokePushToken();
    expect(result).toEqual({ status: 'error', message: 'fail' });
  });

  it('initializes foreground listener and schedules notification', async () => {
    const { initializeFCMListeners } = require('@/notifications/firebasePush');
    const messaging = jest.requireMock('@react-native-firebase/messaging');
    const unsubscribe = initializeFCMListeners();
    expect(messaging.__mock.onMessage).toHaveBeenCalledTimes(1);

    const cb = messaging.__mock.onMessage.mock.calls[0]?.[0];
    expect(typeof cb).toBe('function');
    const Notifications = jest.requireMock('expo-notifications');
    await cb?.({
      notification: { title: 'Hi', body: 'There' },
      data: { foo: 'bar' },
    });

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: { title: 'Hi', body: 'There', data: { foo: 'bar' } },
      trigger: null,
    });

    unsubscribe?.();
  });

  it('initializes token refresh listener', () => {
    const { initializeFCMListeners } = require('@/notifications/firebasePush');
    const messaging = jest.requireMock('@react-native-firebase/messaging');
    const unsubscribe = initializeFCMListeners();
    expect(messaging.__mock.onTokenRefresh).toHaveBeenCalledTimes(1);

    const cb = messaging.__mock.onTokenRefresh.mock.calls[0]?.[0];
    expect(typeof cb).toBe('function');

    // Simulate token refresh (e.g., after app reinstall)
    cb?.('new-refreshed-token');

    unsubscribe?.();
  });

  it('sets background handler on native', () => {
    const { setupBackgroundMessageHandler } = require('@/notifications/firebasePush');
    const messaging = jest.requireMock('@react-native-firebase/messaging');
    setupBackgroundMessageHandler();
    expect(messaging.__mock.setBackgroundMessageHandler).toHaveBeenCalledTimes(1);
  });

  it('skips listeners on web', () => {
    const {
      initializeFCMListeners,
      setupBackgroundMessageHandler,
    } = require('@/notifications/firebasePush');
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    expect(initializeFCMListeners()).toBeUndefined();
    expect(setupBackgroundMessageHandler()).toBeUndefined();
  });

  describe('when Firebase is disabled', () => {
    beforeEach(() => {
      process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = 'false';
    });

    it('returns unavailable when registering for push', async () => {
      const { registerForPushNotifications } = require('@/notifications/firebasePush');
      const result = await registerForPushNotifications();
      expect(result).toEqual({ status: 'unavailable' });
    });

    it('returns unavailable when revoking token', async () => {
      const { revokePushToken } = require('@/notifications/firebasePush');
      const result = await revokePushToken();
      expect(result).toEqual({ status: 'unavailable' });
    });

    it('skips foreground listener setup', () => {
      const { initializeFCMListeners } = require('@/notifications/firebasePush');
      const unsubscribe = initializeFCMListeners();
      expect(unsubscribe).toBeUndefined();
    });

    it('skips background handler setup', () => {
      const { setupBackgroundMessageHandler } = require('@/notifications/firebasePush');
      const result = setupBackgroundMessageHandler();
      expect(result).toBeUndefined();
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = 'true';
    });

    it('handles token retrieval failure', async () => {
      const { registerForPushNotifications } = require('@/notifications/firebasePush');
      const messaging = jest.requireMock('@react-native-firebase/messaging');
      messaging.__mock.getToken.mockRejectedValue(new Error('Token retrieval failed'));

      const result = await registerForPushNotifications();
      expect(result.status).toBe('error');
    });

    it('handles provisional authorization status', async () => {
      const { registerForPushNotifications } = require('@/notifications/firebasePush');
      const messaging = jest.requireMock('@react-native-firebase/messaging');
      messaging.__mock.requestPermission.mockResolvedValue(
        messaging.AuthorizationStatus.PROVISIONAL,
      );

      const result = await registerForPushNotifications();
      expect(result).toEqual({ status: 'registered', token: 'mock-token' });
    });

    it('handles register device failure', async () => {
      const { registerForPushNotifications } = require('@/notifications/firebasePush');
      const messaging = jest.requireMock('@react-native-firebase/messaging');
      messaging.__mock.registerDeviceForRemoteMessages.mockRejectedValue(
        new Error('Registration failed'),
      );

      const result = await registerForPushNotifications();
      expect(result.status).toBe('error');
    });

    it('returns error when getToken returns empty token', async () => {
      const { registerForPushNotifications } = require('@/notifications/firebasePush');
      const messaging = jest.requireMock('@react-native-firebase/messaging');
      messaging.__mock.getToken.mockResolvedValue('');

      const result = await registerForPushNotifications();
      expect(result).toEqual({ status: 'error', message: 'No token' });
    });

    it('returns error when getToken returns null', async () => {
      const { registerForPushNotifications } = require('@/notifications/firebasePush');
      const messaging = jest.requireMock('@react-native-firebase/messaging');
      messaging.__mock.getToken.mockResolvedValue(null);

      const result = await registerForPushNotifications();
      expect(result).toEqual({ status: 'error', message: 'No token' });
    });

    it('handles FCM listener initialization failure gracefully', () => {
      const { initializeFCMListeners } = require('@/notifications/firebasePush');
      const messaging = jest.requireMock('@react-native-firebase/messaging');
      messaging.__mock.onMessage.mockImplementation(() => {
        throw new Error('Listener setup failed');
      });

      // Should not throw - errors are logged
      expect(() => initializeFCMListeners()).not.toThrow();
    });

    it('handles background handler setup failure gracefully', () => {
      const { setupBackgroundMessageHandler } = require('@/notifications/firebasePush');
      const messagingMock = jest.requireMock('@react-native-firebase/messaging');
      messagingMock.default = jest.fn(() => {
        throw new Error('Background handler setup failed');
      });

      // Should not throw - errors are logged
      expect(() => setupBackgroundMessageHandler()).not.toThrow();
    });

    it('handles notification display failure in foreground listener', async () => {
      const { initializeFCMListeners } = require('@/notifications/firebasePush');
      const messaging = jest.requireMock('@react-native-firebase/messaging');
      const Notifications = jest.requireMock('expo-notifications');

      // Mock scheduleNotificationAsync to throw error
      Notifications.scheduleNotificationAsync.mockRejectedValue(new Error('Display failed'));

      initializeFCMListeners();

      const cb = messaging.__mock.onMessage.mock.calls[0]?.[0];

      // Should not throw even if notification display fails
      await expect(
        cb?.({
          notification: { title: 'Test', body: 'Body' },
          data: {},
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('iOS-specific behavior', () => {
    beforeEach(() => {
      process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = 'true';
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    });

    it('registers successfully on iOS when permission is already granted', async () => {
      const { registerForPushNotifications } = require('@/notifications/firebasePush');
      const Notifications = jest.requireMock('expo-notifications');
      Notifications.getPermissionsAsync.mockResolvedValue({
        granted: true,
        status: 'granted',
        canAskAgain: true,
      });

      const result = await registerForPushNotifications();
      expect(result).toEqual({ status: 'registered', token: 'mock-token' });
      expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('requests permission on iOS when not already granted', async () => {
      const { registerForPushNotifications } = require('@/notifications/firebasePush');
      const Notifications = jest.requireMock('expo-notifications');
      Notifications.getPermissionsAsync.mockResolvedValue({
        granted: false,
        status: 'denied',
        canAskAgain: true,
      });
      Notifications.requestPermissionsAsync.mockResolvedValue({
        granted: true,
        status: 'granted',
        canAskAgain: true,
      });

      const result = await registerForPushNotifications();
      expect(result).toEqual({ status: 'registered', token: 'mock-token' });
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    });

    it('returns denied on iOS when permission cannot be asked again', async () => {
      const { registerForPushNotifications } = require('@/notifications/firebasePush');
      const Notifications = jest.requireMock('expo-notifications');
      Notifications.getPermissionsAsync.mockResolvedValue({
        granted: false,
        status: 'denied',
        canAskAgain: false,
      });

      const result = await registerForPushNotifications();
      expect(result).toEqual({ status: 'denied' });
      expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('returns denied on iOS when user denies permission request', async () => {
      const { registerForPushNotifications } = require('@/notifications/firebasePush');
      const Notifications = jest.requireMock('expo-notifications');
      Notifications.getPermissionsAsync.mockResolvedValue({
        granted: false,
        status: 'denied',
        canAskAgain: true,
      });
      Notifications.requestPermissionsAsync.mockResolvedValue({
        granted: false,
        status: 'denied',
        canAskAgain: false,
      });

      const result = await registerForPushNotifications();
      expect(result).toEqual({ status: 'denied' });
    });

    it('continues registration on iOS if permission check throws', async () => {
      const { registerForPushNotifications } = require('@/notifications/firebasePush');
      const Notifications = jest.requireMock('expo-notifications');
      Notifications.getPermissionsAsync.mockRejectedValue(new Error('Permission API failed'));

      const result = await registerForPushNotifications();
      // Should continue and succeed despite permission check failure
      expect(result).toEqual({ status: 'registered', token: 'mock-token' });
    });
  });

  describe('Android-specific behavior', () => {
    beforeEach(() => {
      process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = 'true';
      Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    });

    // Note: Android POST_NOTIFICATIONS permission tests are complex to properly mock
    // since react-native module requires are hard to intercept mid-test.
    // The actual Android permission logic is tested via integration tests.
    // These tests verify the basic flow continues even when permissions APIs are unavailable.

    it('handles Android registration flow', async () => {
      const { registerForPushNotifications } = require('@/notifications/firebasePush');
      const result = await registerForPushNotifications();
      // Should succeed on Android
      expect(result).toEqual({ status: 'registered', token: 'mock-token' });
    });

    it('returns denied when POST_NOTIFICATIONS permission is rejected', async () => {
      jest.doMock('react-native', () => ({
        Platform: { OS: 'android', Version: 33 },
        PermissionsAndroid: {
          request: jest.fn(async () => 'denied'),
          PERMISSIONS: { POST_NOTIFICATIONS: 'post' },
          RESULTS: { GRANTED: 'granted', DENIED: 'denied' },
        },
      }));

      const firebasePush = loadFreshFirebasePush();
      const result = await firebasePush.registerForPushNotifications();
      expect(result).toEqual({ status: 'denied' });
      jest.dontMock('react-native');
    });

    it('continues when POST_NOTIFICATIONS permission throws', async () => {
      const reactNative = require('react-native');
      reactNative.Platform.Version = 33;
      (Platform as any).Version = 33;
      reactNative.PermissionsAndroid = {
        request: jest.fn(async () => {
          throw new Error('perm failed');
        }),
        PERMISSIONS: { POST_NOTIFICATIONS: 'post' },
        RESULTS: { GRANTED: 'granted' },
      };

      const { registerForPushNotifications } = require('@/notifications/firebasePush');
      const result = await registerForPushNotifications();
      expect(result).toEqual({ status: 'registered', token: 'mock-token' });
    });
  });

  describe('token caching and deduplication', () => {
    beforeEach(() => {
      process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = 'true';
    });

    it('returns cached token on subsequent calls without re-registering', async () => {
      const { registerForPushNotifications } = require('@/notifications/firebasePush');
      const messaging = jest.requireMock('@react-native-firebase/messaging');

      // First call
      const result1 = await registerForPushNotifications();
      expect(result1).toEqual({ status: 'registered', token: 'mock-token' });

      // Clear mocks to verify they're not called again
      messaging.__mock.requestPermission.mockClear();
      messaging.__mock.getToken.mockClear();
      messaging.__mock.registerDeviceForRemoteMessages.mockClear();

      // Second call - should return cached token
      const result2 = await registerForPushNotifications();
      expect(result2).toEqual({ status: 'registered', token: 'mock-token' });
      expect(messaging.__mock.requestPermission).not.toHaveBeenCalled();
      expect(messaging.__mock.getToken).not.toHaveBeenCalled();
      expect(messaging.__mock.registerDeviceForRemoteMessages).not.toHaveBeenCalled();
    });

    it('deduplicates concurrent registration calls', async () => {
      const { registerForPushNotifications } = require('@/notifications/firebasePush');
      const messaging = jest.requireMock('@react-native-firebase/messaging');

      // Make multiple concurrent calls
      const [result1, result2, result3] = await Promise.all([
        registerForPushNotifications(),
        registerForPushNotifications(),
        registerForPushNotifications(),
      ]);

      // All should succeed with same token
      expect(result1).toEqual({ status: 'registered', token: 'mock-token' });
      expect(result2).toEqual({ status: 'registered', token: 'mock-token' });
      expect(result3).toEqual({ status: 'registered', token: 'mock-token' });

      // Registration should only happen once
      expect(messaging.__mock.requestPermission).toHaveBeenCalledTimes(1);
      expect(messaging.__mock.getToken).toHaveBeenCalledTimes(1);
    });
  });

  describe('module init caching', () => {
    it('returns cached native token loaded on module init', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
      jest.doMock('react-native-mmkv', () => ({
        createMMKV: jest.fn(() => ({
          getString: jest.fn(() => 'cached-native-token'),
        })),
      }));

      const firebasePush = loadFreshFirebasePush();

      const messaging = jest.requireMock('@react-native-firebase/messaging');
      messaging.__mock.requestPermission.mockClear();

      const result = await firebasePush.registerForPushNotifications();
      expect(result).toEqual({ status: 'registered', token: 'cached-native-token' });
      expect(messaging.__mock.requestPermission).not.toHaveBeenCalled();
      jest.dontMock('react-native-mmkv');
    });

    it('handles MMKV load failure on module init', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
      jest.doMock('react-native-mmkv', () => {
        throw new Error('mmkv missing');
      });

      const firebasePush = loadFreshFirebasePush();
      const result = await firebasePush.registerForPushNotifications();
      expect(result.status).toBe('registered');
      jest.dontMock('react-native-mmkv');
    });
  });

  describe('background handler logging', () => {
    it('logs background notification payload', () => {
      const { setupBackgroundMessageHandler } = require('@/notifications/firebasePush');
      const messaging = jest.requireMock('@react-native-firebase/messaging');
      setupBackgroundMessageHandler();

      const handler = messaging.__mock.getOnMessageCallback();
      handler?.({ data: { foo: 'bar' } });
      expect(console.info).toHaveBeenCalled();
    });
  });
});
