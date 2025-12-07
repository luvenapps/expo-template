import { Platform } from 'react-native';
import { __registerForWebPush } from '@/notifications/firebasePush';

jest.mock('firebase/app', () => {
  const apps: any[] = [];
  return {
    __esModule: true,
    getApps: jest.fn(() => apps),
    initializeApp: jest.fn((config) => {
      const app = { config, __app: true };
      apps.push(app);
      return app;
    }),
  };
});

jest.mock('firebase/messaging', () => ({
  __esModule: true,
  getMessaging: jest.fn(() => ({ __messaging: true })),
  getToken: jest.fn(async () => 'web-token'),
  isSupported: jest.fn(async () => true),
  onMessage: jest.fn(),
}));

describe('__registerForWebPush', () => {
  const originalPlatform = Platform.OS;
  const originalNotification = global.Notification;
  const originalNavigator = global.navigator;
  const originalEnv = { ...process.env };
  let debugSpy: jest.SpyInstance;
  let infoSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    (Platform as any).OS = 'web';
    process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY = 'test-vapid';
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY = 'api';
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN = 'auth';
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = 'project';
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET = 'bucket';
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = 'sender';
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID = 'app';

    const notificationMock = {
      permission: 'granted',
      requestPermission: jest.fn(async () => 'granted'),
    } as any;
    const registration = {
      scope: '/',
      update: jest.fn(),
      unregister: jest.fn(),
      active: { postMessage: jest.fn() },
      installing: null,
      waiting: null,
      pushManager: {},
      navigationPreload: {},
    } as unknown as ServiceWorkerRegistration;
    const navigatorMock = {
      serviceWorker: {
        getRegistration: jest.fn(async () => registration),
        register: jest.fn(async () => registration),
        ready: Promise.resolve(registration),
      },
    } as any;

    (global as any).Notification = notificationMock;
    (global as any).navigator = navigatorMock;
    (global as any).window = {
      ...(global as any).window,
      Notification: notificationMock,
      navigator: navigatorMock,
    };
  });

  afterEach(() => {
    (Platform as any).OS = originalPlatform;
    global.Notification = originalNotification;
    global.navigator = originalNavigator;
    process.env = { ...originalEnv };
    debugSpy.mockRestore();
    infoSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('returns denied when permission is blocked', async () => {
    (global as any).Notification.permission = 'denied';
    (global as any).Notification.requestPermission = jest.fn(async () => 'denied');
    const result = await __registerForWebPush();
    expect(result.status).toBe('denied');
  });

  it('registers token when supported and permitted', async () => {
    const result = await __registerForWebPush();
    expect(result).toEqual({ status: 'registered', token: 'web-token' });

    const { getMessaging, getToken } = require('firebase/messaging');
    expect(getMessaging).toHaveBeenCalled();
    expect(getToken).toHaveBeenCalled();
  });

  it('returns unavailable when messaging is not supported', async () => {
    const messagingModule = require('firebase/messaging');
    messagingModule.isSupported.mockResolvedValueOnce(false);

    const result = await __registerForWebPush();
    expect(result.status).toBe('unavailable');
  });
});
