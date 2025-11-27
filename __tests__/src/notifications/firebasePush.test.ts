import { Platform } from 'react-native';
import { registerForPushNotifications } from '@/notifications/firebasePush';

jest.mock('@react-native-firebase/messaging', () => {
  const AuthorizationStatus = {
    AUTHORIZED: 1,
    PROVISIONAL: 2,
    DENIED: 3,
  };
  const requestPermission = jest.fn(() => AuthorizationStatus.AUTHORIZED);
  const getToken = jest.fn(() => 'mock-token');
  return {
    __esModule: true,
    default: jest.fn(() => ({
      requestPermission,
      getToken,
    })),
    __mock: {
      requestPermission,
      getToken,
      AuthorizationStatus,
    },
    AuthorizationStatus,
  };
});

describe('firebasePush', () => {
  const originalPlatform = Platform.OS;
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;

  beforeAll(() => {
    // Suppress console output during tests for cleaner output
    console.log = jest.fn();
    console.warn = jest.fn();
  });

  afterAll(() => {
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
  });

  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
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
});
