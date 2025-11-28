import { Platform } from 'react-native';
import {
  initializeFCMListeners,
  registerForPushNotifications,
  setupBackgroundMessageHandler,
} from '@/notifications/firebasePush';

jest.mock('@react-native-firebase/messaging', () => {
  const AuthorizationStatus = {
    AUTHORIZED: 1,
    PROVISIONAL: 2,
    DENIED: 3,
  };
  const requestPermission = jest.fn().mockResolvedValue(AuthorizationStatus.AUTHORIZED);
  const getToken = jest.fn().mockResolvedValue('mock-token');
  let onMessageCallback: ((msg: any) => void) | null = null;
  const onMessage = jest.fn((cb: (msg: any) => void) => {
    onMessageCallback = cb;
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
      onMessage,
      setBackgroundMessageHandler,
    })),
    __mock: {
      requestPermission,
      getToken,
      onMessage,
      setBackgroundMessageHandler,
      getOnMessageCallback: () => onMessageCallback,
      reset: () => {
        onMessageCallback = null;
        requestPermission.mockReset();
        getToken.mockReset();
        onMessage.mockReset();
        setBackgroundMessageHandler.mockReset();
        requestPermission.mockResolvedValue(AuthorizationStatus.AUTHORIZED);
        getToken.mockResolvedValue('mock-token');
        onMessage.mockImplementation((cb: (msg: any) => void) => {
          onMessageCallback = cb;
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

describe('firebasePush', () => {
  const originalPlatform = Platform.OS;
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;

  beforeAll(() => {
    console.log = jest.fn();
    console.warn = jest.fn();
  });

  afterAll(() => {
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
  });

  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    const messaging = jest.requireMock('@react-native-firebase/messaging');
    messaging.__mock.reset();
    const Notifications = jest.requireMock('expo-notifications');
    Notifications.scheduleNotificationAsync.mockClear();
    Notifications.scheduleNotificationAsync.mockResolvedValue(undefined);
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalPlatform, configurable: true });
  });

  it('returns unavailable on web', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    const result = await registerForPushNotifications();
    expect(result.status).toBe('unavailable');
  });

  it('registers and returns token on native when authorized', async () => {
    const result = await registerForPushNotifications();
    expect(result).toEqual({ status: 'registered', token: 'mock-token' });
  });

  it('returns denied when permission not granted', async () => {
    const messaging = jest.requireMock('@react-native-firebase/messaging');
    messaging.__mock.requestPermission.mockResolvedValue(messaging.AuthorizationStatus.DENIED);
    const result = await registerForPushNotifications();
    expect(result.status).toBe('denied');
  });

  it('returns error on exception', async () => {
    const messaging = jest.requireMock('@react-native-firebase/messaging');
    messaging.__mock.requestPermission.mockRejectedValue(new Error('boom'));
    const result = await registerForPushNotifications();
    expect(result.status).toBe('error');
  });

  it('initializes foreground listener and schedules notification', async () => {
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

  it('sets background handler on native', () => {
    const messaging = jest.requireMock('@react-native-firebase/messaging');
    setupBackgroundMessageHandler();
    expect(messaging.__mock.setBackgroundMessageHandler).toHaveBeenCalledTimes(1);
  });

  it('skips listeners on web', () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    expect(initializeFCMListeners()).toBeUndefined();
    expect(setupBackgroundMessageHandler()).toBeUndefined();
  });
});
