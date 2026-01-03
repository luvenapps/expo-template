import {
  __registerForWebPush,
  __resetWebPushStateForTests,
  revokePushToken,
  setupWebForegroundMessageListener,
} from '@/notifications/firebasePush';
import { Platform } from 'react-native';

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
  deleteToken: jest.fn(async () => true),
  onMessage: jest.fn(),
}));

jest.mock('@/observability/notificationEvents', () => ({
  emitNotificationEvent: jest.fn(),
}));

describe('firebasePush Web', () => {
  const originalPlatform = Platform.OS;
  const originalNotification = global.Notification;
  const originalNavigator = global.navigator;
  const originalEnv = { ...process.env };
  let debugSpy: jest.SpyInstance;
  let infoSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let lastNotification: any;

  beforeEach(() => {
    __resetWebPushStateForTests();
    jest.clearAllMocks();
    debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (Platform as any).OS = 'web';
    process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY = 'test-vapid';
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY = 'api';
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN = 'auth';
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = 'project';
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET = 'bucket';
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = 'sender';
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID = 'app';
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = 'true';

    lastNotification = null;
    const notificationMock = jest.fn().mockImplementation(() => {
      lastNotification = {
        close: jest.fn(),
        onclick: null,
        onclose: null,
      };
      return lastNotification;
    }) as unknown as Notification & {
      permission: string;
      requestPermission: jest.Mock<Promise<NotificationPermission>>;
    };
    notificationMock.permission = 'granted';
    notificationMock.requestPermission = jest.fn(async () => 'granted');
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
      focus: jest.fn(),
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
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('returns denied when permission is blocked', async () => {
    (global as any).Notification.permission = 'denied';
    (global as any).Notification.requestPermission = jest.fn(async () => 'denied');
    const result = await __registerForWebPush();
    expect(result.status).toBe('denied');
  });

  it('registers token when supported and permitted', async () => {
    (global as any).Notification.permission = 'default';
    (global as any).Notification.requestPermission = jest.fn(async () => 'granted');
    const messagingModule = require('firebase/messaging');
    messagingModule.isSupported.mockResolvedValueOnce(true);
    messagingModule.getToken.mockResolvedValueOnce('web-token');

    const result = await __registerForWebPush();
    expect(result).toEqual({ status: 'registered', token: 'web-token' });

    const { getMessaging, getToken } = require('firebase/messaging');
    expect(getMessaging).toHaveBeenCalled();
    expect(getToken).toHaveBeenCalled();
  });

  it('returns unavailable when messaging is not supported', async () => {
    const messagingModule = require('firebase/messaging');
    messagingModule.isSupported.mockResolvedValueOnce(false);
    (global as any).Notification.permission = 'default';
    (global as any).Notification.requestPermission = jest.fn(async () => 'granted');
    messagingModule.getToken.mockResolvedValueOnce('web-token');

    const result = await __registerForWebPush();
    expect(result.status).toBe('unavailable');
  });

  it('reuses in-flight registration to avoid double token generation', async () => {
    (global as any).Notification.permission = 'default';
    (global as any).Notification.requestPermission = jest.fn(async () => 'granted');
    const { getToken } = require('firebase/messaging');
    const messagingModule = require('firebase/messaging');
    messagingModule.isSupported.mockResolvedValue(true);
    getToken.mockResolvedValueOnce('token-1');
    getToken.mockResolvedValueOnce('token-2');

    const [first, second] = await Promise.all([__registerForWebPush(), __registerForWebPush()]);

    expect(first.status).toBe('registered');
    expect(second.status).toBe('registered');
    // Only one getToken call should have happened because of in-flight reuse
    expect(getToken).toHaveBeenCalledTimes(1);
  });

  it('prevents duplicate listener registration when called multiple times', async () => {
    // Enable Firebase for this test
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = 'true';

    const { onMessage } = require('firebase/messaging');
    const { initializeApp, getApps } = require('firebase/app');

    // Initialize Firebase app first if not already initialized
    if (getApps().length === 0) {
      initializeApp({
        apiKey: 'api',
        authDomain: 'auth',
        projectId: 'project',
        storageBucket: 'bucket',
        messagingSenderId: 'sender',
        appId: 'app',
      });
    }

    // Clear debug spy to start fresh
    debugSpy.mockClear();

    // Call setup function four times
    setupWebForegroundMessageListener();
    const firstCallLogs = [...logSpy.mock.calls];

    setupWebForegroundMessageListener();
    setupWebForegroundMessageListener();
    setupWebForegroundMessageListener();

    // Check if the listener was registered or already registered on first call
    const wasAlreadyRegistered = firstCallLogs.some((call) =>
      String(call[0]).includes('Foreground listener already registered, skipping'),
    );

    if (wasAlreadyRegistered) {
      // If it was already registered, all 4 calls should log "already registered"
      const alreadyRegisteredCalls = logSpy.mock.calls.filter((call) =>
        String(call[0]).includes('Foreground listener already registered, skipping'),
      );
      expect(alreadyRegisteredCalls.length).toBe(4);
    } else {
      // If it wasn't registered, first call should succeed, next 3 should skip
      const alreadyRegisteredCalls = logSpy.mock.calls.filter((call) =>
        String(call[0]).includes('Foreground listener already registered, skipping'),
      );
      expect(alreadyRegisteredCalls.length).toBe(3);

      // Verify onMessage was called exactly once
      expect(onMessage).toHaveBeenCalledTimes(1);
    }
  });

  it('revokes successfully on web by unsubscribing from push subscription', async () => {
    (Platform as any).OS = 'web';

    const mockUnsubscribe = jest.fn().mockResolvedValue(true);
    const mockGetSubscription = jest.fn().mockResolvedValue({
      unsubscribe: mockUnsubscribe,
    });
    const mockRegistration = {
      pushManager: {
        getSubscription: mockGetSubscription,
      },
      unregister: jest.fn(),
    } as any;

    (global as any).navigator.serviceWorker.getRegistration = jest
      .fn()
      .mockResolvedValue(mockRegistration);

    const result = await revokePushToken();
    expect(result.status).toBe('revoked');
    expect(mockGetSubscription).toHaveBeenCalled();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('emits analytics events for foreground notification display/click/dismiss', () => {
    const { onMessage } = require('firebase/messaging');
    const { emitNotificationEvent } = require('@/observability/notificationEvents');
    const { initializeApp, getApps } = require('firebase/app');

    if (getApps().length === 0) {
      initializeApp({
        apiKey: 'api',
        authDomain: 'auth',
        projectId: 'project',
        storageBucket: 'bucket',
        messagingSenderId: 'sender',
        appId: 'app',
      });
    }

    let handler: (payload: any) => void = () => undefined;
    onMessage.mockImplementation((_messaging: any, callback: (payload: any) => void) => {
      handler = callback;
    });

    setupWebForegroundMessageListener();

    handler({
      notification: { title: 'Hello', body: 'World' },
      data: { tag: 'habits' },
    });

    expect(emitNotificationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'notification:foreground:displayed',
        payload: expect.objectContaining({ tag: 'habits', title: 'Hello' }),
      }),
    );

    lastNotification?.onclick?.();
    lastNotification?.onclose?.();

    expect(emitNotificationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'notification:foreground:clicked',
        payload: expect.objectContaining({ tag: 'habits', title: 'Hello' }),
      }),
    );

    expect(emitNotificationEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'notification:foreground:dismissed',
      }),
    );

    emitNotificationEvent.mockClear();
    handler({
      notification: { title: 'Later', body: 'Reminder' },
      data: { tag: 'habits' },
    });
    lastNotification?.onclose?.();

    expect(emitNotificationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'notification:foreground:dismissed',
        payload: expect.objectContaining({ tag: 'habits', title: 'Later' }),
      }),
    );
  });

  describe('Web registration edge cases', () => {
    it('returns unavailable when window is undefined', async () => {
      const originalWindow = global.window;
      delete (global as any).window;

      const result = await __registerForWebPush();
      expect(result.status).toBe('unavailable');

      (global as any).window = originalWindow;
    });

    it('returns unavailable when Notification API is not available', async () => {
      delete (global as any).window.Notification;
      delete (global as any).Notification;

      const result = await __registerForWebPush();
      expect(result.status).toBe('unavailable');
    });

    it('returns unavailable when serviceWorker is not available', async () => {
      delete (global as any).navigator.serviceWorker;

      const result = await __registerForWebPush();
      expect(result.status).toBe('unavailable');
    });

    it('returns unavailable when Firebase config is incomplete (missing vapidKey)', async () => {
      delete process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY;

      const result = await __registerForWebPush();
      expect(result.status).toBe('unavailable');
    });

    it('returns unavailable when Firebase config is incomplete (missing apiKey)', async () => {
      delete process.env.EXPO_PUBLIC_FIREBASE_API_KEY;

      const result = await __registerForWebPush();
      expect(result.status).toBe('unavailable');
    });
  });

  describe('Web revoke edge cases', () => {
    it('returns revoked when no service worker registration exists', async () => {
      (Platform as any).OS = 'web';
      (global as any).navigator.serviceWorker.getRegistration = jest.fn(async () => null);

      const result = await revokePushToken();
      expect(result.status).toBe('revoked');
    });

    it('returns revoked when no push subscription exists', async () => {
      (Platform as any).OS = 'web';

      const mockRegistration = {
        pushManager: {
          getSubscription: jest.fn().mockResolvedValue(null),
        },
      } as any;

      (global as any).navigator.serviceWorker.getRegistration = jest
        .fn()
        .mockResolvedValue(mockRegistration);

      const result = await revokePushToken();
      expect(result.status).toBe('revoked');
    });

    it('returns error when unsubscribe fails', async () => {
      (Platform as any).OS = 'web';

      const mockUnsubscribe = jest.fn().mockRejectedValue(new Error('Unsubscribe failed'));
      const mockGetSubscription = jest.fn().mockResolvedValue({
        unsubscribe: mockUnsubscribe,
      });
      const mockRegistration = {
        pushManager: {
          getSubscription: mockGetSubscription,
        },
      } as any;

      (global as any).navigator.serviceWorker.getRegistration = jest
        .fn()
        .mockResolvedValue(mockRegistration);

      const result = await revokePushToken();
      expect(result).toEqual({ status: 'error', message: 'Unsubscribe failed' });
    });

    it('logs warning when unsubscribe returns false', async () => {
      (Platform as any).OS = 'web';

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const mockUnsubscribe = jest.fn().mockResolvedValue(false);
      const mockGetSubscription = jest.fn().mockResolvedValue({
        unsubscribe: mockUnsubscribe,
      });
      const mockRegistration = {
        pushManager: {
          getSubscription: mockGetSubscription,
        },
      } as any;

      (global as any).navigator.serviceWorker.getRegistration = jest
        .fn()
        .mockResolvedValue(mockRegistration);

      const result = await revokePushToken();
      expect(result.status).toBe('revoked');

      warnSpy.mockRestore();
    });
  });

  describe('Foreground listener setup edge cases', () => {
    it('skips setup when not on web platform', () => {
      (Platform as any).OS = 'ios';
      setupWebForegroundMessageListener();
      // Should not throw or cause issues
    });

    it('skips setup when Firebase is disabled', () => {
      process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = 'false';
      setupWebForegroundMessageListener();
      // Should not throw or cause issues
    });

    it('handles missing Notification permission gracefully', () => {
      const { onMessage } = require('firebase/messaging');
      const { initializeApp, getApps } = require('firebase/app');

      if (getApps().length === 0) {
        initializeApp({
          apiKey: 'api',
          authDomain: 'auth',
          projectId: 'project',
          storageBucket: 'bucket',
          messagingSenderId: 'sender',
          appId: 'app',
        });
      }

      (global as any).Notification.permission = 'denied';

      let handler: (payload: any) => void = () => undefined;
      onMessage.mockImplementation((_messaging: any, callback: (payload: any) => void) => {
        handler = callback;
      });

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      setupWebForegroundMessageListener();

      handler({
        notification: { title: 'Test', body: 'Message' },
        data: {},
      });

      // Should not throw

      warnSpy.mockRestore();
    });

    it('handles notification display error gracefully', () => {
      const { onMessage } = require('firebase/messaging');
      const { initializeApp, getApps } = require('firebase/app');

      if (getApps().length === 0) {
        initializeApp({
          apiKey: 'api',
          authDomain: 'auth',
          projectId: 'project',
          storageBucket: 'bucket',
          messagingSenderId: 'sender',
          appId: 'app',
        });
      }

      const originalNotification = global.Notification;
      const notificationMock = jest.fn().mockImplementation(() => {
        throw new Error('Notification API error');
      }) as any;
      notificationMock.permission = 'granted';
      (global as any).Notification = notificationMock;

      let handler: (payload: any) => void = () => undefined;
      onMessage.mockImplementation((_messaging: any, callback: (payload: any) => void) => {
        handler = callback;
      });

      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      setupWebForegroundMessageListener();

      // Should not throw even if notification display fails
      expect(() =>
        handler({
          notification: { title: 'Test', body: 'Message' },
          data: {},
        }),
      ).not.toThrow();

      global.Notification = originalNotification;
      errorSpy.mockRestore();
    });
  });
});
