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
}));

describe('firebasePush Native', () => {
  const originalPlatform = Platform.OS;
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;
  const originalConsoleDebug = console.debug;
  const originalConsoleError = console.error;
  const originalConsoleInfo = console.info;
  const originalEnvFlag = process.env.EXPO_PUBLIC_TURN_ON_FIREBASE;

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
  });
});
