import { DOMAIN } from '@/config/domain.config';
import {
  __registerForWebPush,
  __resetWebPushStateForTests,
  ensureServiceWorkerRegistered,
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
  const loadFreshFirebasePush = () => {
    let module = null as unknown as typeof import('@/notifications/firebasePush');
    jest.isolateModules(() => {
      module =
        require('@/notifications/firebasePush') as typeof import('@/notifications/firebasePush');
    });
    return module;
  };
  const ensureWebGlobals = () => {
    const navigator = (global as any).navigator;
    const windowMock = {
      ...(global as any).window,
      Notification: (global as any).Notification,
      navigator,
      focus: jest.fn(),
    };
    Object.defineProperty(global, 'window', {
      value: windowMock,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(global, 'navigator', {
      value: navigator,
      configurable: true,
      writable: true,
    });
  };
  const ensureWebConfigEnv = () => {
    Object.assign(process.env, {
      EXPO_PUBLIC_FIREBASE_VAPID_KEY: 'test-vapid',
      EXPO_PUBLIC_FIREBASE_API_KEY: 'api',
      EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: 'auth',
      EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'project',
      EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: 'bucket',
      EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: 'sender',
      EXPO_PUBLIC_FIREBASE_APP_ID: 'app',
      EXPO_PUBLIC_TURN_ON_FIREBASE: 'true',
    });
  };
  const ensureWebStorage = () => {
    (global as any).localStorage = {
      getItem: jest.fn(() => null),
      removeItem: jest.fn(),
      setItem: jest.fn(),
    };
  };

  beforeEach(() => {
    __resetWebPushStateForTests();
    jest.clearAllMocks();
    debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (Platform as any).OS = 'web';
    ensureWebConfigEnv();

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
    Object.defineProperty(global, 'navigator', {
      value: navigatorMock,
      configurable: true,
      writable: true,
    });
    ensureWebGlobals();
  });

  afterEach(() => {
    (Platform as any).OS = originalPlatform;
    global.Notification = originalNotification;
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
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
      data: { tag: 'entries' },
    });

    expect(emitNotificationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'notification:foreground:displayed',
        payload: expect.objectContaining({ tag: 'entries', title: 'Hello' }),
      }),
    );

    lastNotification?.onclick?.();
    lastNotification?.onclose?.();

    expect(emitNotificationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'notification:foreground:clicked',
        payload: expect.objectContaining({ tag: 'entries', title: 'Hello' }),
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
      data: { tag: 'entries' },
    });
    lastNotification?.onclose?.();

    expect(emitNotificationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'notification:foreground:dismissed',
        payload: expect.objectContaining({ tag: 'entries', title: 'Later' }),
      }),
    );
  });

  describe('Web registration edge cases', () => {
    it('clears cached token on import when permission is not granted', () => {
      const removeItem = jest.fn();
      const getItem = jest.fn(() => 'cached-token');
      const originalLocalStorage = global.localStorage;
      const originalNotification = global.Notification;

      (global as any).localStorage = {
        getItem,
        removeItem,
      };
      const notificationMock = jest.fn() as unknown as Notification & {
        permission: string;
      };
      notificationMock.permission = 'denied';
      (global as any).Notification = notificationMock;

      jest.isolateModules(() => {
        require('@/notifications/firebasePush');
      });

      expect(getItem).toHaveBeenCalled();
      expect(removeItem).toHaveBeenCalledWith(`${DOMAIN.app.name}-web-fcm-token`);

      global.localStorage = originalLocalStorage;
      global.Notification = originalNotification;
    });

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

    it('reuses cached token when service worker and subscription are active', async () => {
      const removeItem = jest.fn();
      const getItem = jest.fn(() => 'cached-token');
      const originalLocalStorage = global.localStorage;
      const originalNotification = global.Notification;
      const originalNavigator = global.navigator;
      const mockGetSubscription = jest.fn().mockResolvedValue({ endpoint: 'push' });
      const registration = {
        active: { postMessage: jest.fn() },
        pushManager: { getSubscription: mockGetSubscription },
      } as any;

      (global as any).localStorage = {
        getItem,
        removeItem,
        setItem: jest.fn(),
      };
      const notificationMock = jest.fn() as unknown as Notification & {
        permission: string;
        requestPermission: jest.Mock<Promise<NotificationPermission>>;
      };
      notificationMock.permission = 'granted';
      notificationMock.requestPermission = jest.fn(async () => 'granted');
      (global as any).Notification = notificationMock;
      (global as any).navigator = {
        serviceWorker: {
          getRegistration: jest.fn(async () => registration),
        },
      };
      ensureWebGlobals();

      const { getToken } = require('firebase/messaging');
      getToken.mockClear();

      const firebasePush = loadFreshFirebasePush();
      const result = await firebasePush.__registerForWebPush();
      expect(result).toEqual({ status: 'registered', token: 'cached-token' });
      expect(getToken).not.toHaveBeenCalled();

      global.localStorage = originalLocalStorage;
      global.Notification = originalNotification;
      global.navigator = originalNavigator;
    });

    it('falls through when fast-path check throws', async () => {
      const originalLocalStorage = global.localStorage;
      const originalNotification = global.Notification;
      const originalNavigator = global.navigator;

      (global as any).localStorage = {
        getItem: jest.fn(() => 'cached-token'),
        removeItem: jest.fn(),
        setItem: jest.fn(),
      };
      const notificationMock = jest.fn() as unknown as Notification & {
        permission: string;
        requestPermission: jest.Mock<Promise<NotificationPermission>>;
      };
      notificationMock.permission = 'granted';
      notificationMock.requestPermission = jest.fn(async () => 'granted');
      (global as any).Notification = notificationMock;
      (global as any).navigator = {
        serviceWorker: {
          getRegistration: jest
            .fn()
            .mockImplementationOnce(async () => {
              throw new Error('boom');
            })
            .mockImplementation(async () => ({
              scope: '/',
              active: { postMessage: jest.fn() },
            })),
          register: jest.fn(async () => ({
            scope: '/',
            active: { postMessage: jest.fn() },
          })),
          ready: Promise.resolve({
            scope: '/',
            active: { postMessage: jest.fn() },
          }),
        },
      };
      ensureWebGlobals();

      const { getToken } = require('firebase/messaging');
      getToken.mockReset();
      getToken.mockResolvedValueOnce('fresh-token');

      const firebasePush = loadFreshFirebasePush();
      const result = await firebasePush.__registerForWebPush();
      expect(result).toEqual({ status: 'registered', token: 'fresh-token' });
      expect(getToken).toHaveBeenCalled();

      global.localStorage = originalLocalStorage;
      global.Notification = originalNotification;
      global.navigator = originalNavigator;
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

  describe('Web service worker registration paths', () => {
    it('registers a new service worker when none exists', async () => {
      ensureWebConfigEnv();
      ensureWebStorage();
      (global as any).Notification.permission = 'default';
      (global as any).Notification.requestPermission = jest.fn(async () => 'granted');
      ensureWebGlobals();
      const registration = {
        scope: '/',
        active: { postMessage: jest.fn() },
        installing: null,
        waiting: null,
      } as any;
      (global as any).navigator.serviceWorker.getRegistration = jest.fn(async () => null);
      (global as any).navigator.serviceWorker.register = jest.fn(async () => registration);
      (global as any).navigator.serviceWorker.ready = Promise.resolve(registration);

      const { isSupported, getToken } = require('firebase/messaging');
      isSupported.mockResolvedValue(true);
      getToken.mockResolvedValueOnce('web-token');

      const result = await __registerForWebPush();
      expect(result.status).toBe('registered');
      expect((global as any).navigator.serviceWorker.register).toHaveBeenCalled();
    });

    it('waits for installing service worker to become active', async () => {
      ensureWebConfigEnv();
      ensureWebStorage();
      (global as any).Notification.permission = 'default';
      (global as any).Notification.requestPermission = jest.fn(async () => 'granted');
      ensureWebGlobals();

      const registration = {
        scope: '/',
        active: null,
        installing: {},
        waiting: null,
      } as any;

      (global as any).navigator.serviceWorker.getRegistration = jest.fn(async () => registration);
      (global as any).navigator.serviceWorker.ready = Promise.resolve(registration);

      setTimeout(() => {
        registration.active = { postMessage: jest.fn() };
      }, 10);

      const { isSupported, getToken } = require('firebase/messaging');
      isSupported.mockResolvedValue(true);
      getToken.mockResolvedValueOnce('web-token');

      const result = await __registerForWebPush();
      expect(result).toEqual({ status: 'registered', token: 'web-token' });
    });

    it('returns error when no active service worker is available', async () => {
      ensureWebConfigEnv();
      ensureWebStorage();
      (global as any).Notification.permission = 'default';
      (global as any).Notification.requestPermission = jest.fn(async () => 'granted');
      ensureWebGlobals();

      const registration = {
        scope: '/',
        active: null,
        installing: null,
        waiting: null,
      } as any;

      (global as any).navigator.serviceWorker.getRegistration = jest.fn(async () => registration);
      (global as any).navigator.serviceWorker.ready = Promise.resolve(registration);

      const { isSupported } = require('firebase/messaging');
      isSupported.mockResolvedValue(true);

      const result = await __registerForWebPush();
      expect(result).toEqual({ status: 'error', message: 'No active service worker available' });
    });

    it('returns error when service worker registration fails', async () => {
      ensureWebConfigEnv();
      ensureWebStorage();
      (global as any).Notification.permission = 'default';
      (global as any).Notification.requestPermission = jest.fn(async () => 'granted');
      ensureWebGlobals();
      (global as any).navigator.serviceWorker.getRegistration = jest.fn(async () => {
        throw new Error('nope');
      });

      const { isSupported } = require('firebase/messaging');
      isSupported.mockResolvedValue(true);

      const result = await __registerForWebPush();
      expect(result).toEqual({ status: 'error', message: 'Service worker registration failed' });
    });

    it('returns error when getToken returns no token', async () => {
      ensureWebConfigEnv();
      ensureWebStorage();
      (global as any).Notification.permission = 'default';
      (global as any).Notification.requestPermission = jest.fn(async () => 'granted');
      ensureWebGlobals();
      const { getToken } = require('firebase/messaging');
      const { isSupported } = require('firebase/messaging');
      isSupported.mockResolvedValue(true);
      getToken.mockResolvedValueOnce('');

      const result = await __registerForWebPush();
      expect(result).toEqual({ status: 'error', message: 'No token' });
    });

    it('returns error when getToken throws', async () => {
      ensureWebConfigEnv();
      ensureWebStorage();
      (global as any).Notification.permission = 'default';
      (global as any).Notification.requestPermission = jest.fn(async () => 'granted');
      ensureWebGlobals();
      const { getToken } = require('firebase/messaging');
      const { isSupported } = require('firebase/messaging');
      isSupported.mockResolvedValue(true);
      getToken.mockRejectedValueOnce(new Error('token boom'));

      const result = await __registerForWebPush();
      expect(result).toEqual({ status: 'error', message: 'token boom' });
    });

    it('retries when permission request throws', async () => {
      ensureWebConfigEnv();
      ensureWebStorage();
      (global as any).Notification.permission = 'default';
      const requestPermission = jest.fn<Promise<NotificationPermission>, []>(() =>
        Promise.reject(new Error('permission boom')),
      );
      (global as any).Notification.requestPermission = requestPermission;
      ensureWebGlobals();

      const { isSupported, getToken } = require('firebase/messaging');
      isSupported.mockResolvedValue(true);
      getToken.mockReset();
      getToken.mockResolvedValueOnce('web-token');

      await expect(__registerForWebPush()).rejects.toThrow('permission boom');

      requestPermission.mockResolvedValue('granted');
      const result = await __registerForWebPush();
      expect(result.status).toBe('registered');
      expect(requestPermission).toHaveBeenCalledTimes(2);
    });
  });

  describe('ensureServiceWorkerRegistered', () => {
    it('returns null when not on web', async () => {
      (Platform as any).OS = 'ios';
      await expect(ensureServiceWorkerRegistered()).resolves.toBeNull();
    });

    it('returns null when Firebase is disabled', async () => {
      process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = 'false';
      await expect(ensureServiceWorkerRegistered()).resolves.toBeNull();
    });

    it('skips re-register when service worker is missing and permission is default', async () => {
      ensureWebConfigEnv();
      (Platform as any).OS = 'web';
      (global as any).navigator.serviceWorker.getRegistration = jest.fn(async () => null);
      (global as any).Notification.permission = 'default';
      ensureWebGlobals();

      const result = await ensureServiceWorkerRegistered();
      expect(result).toBeNull();
    });

    it('re-registers when service worker is missing and permission is granted', async () => {
      ensureWebConfigEnv();
      ensureWebStorage();
      (Platform as any).OS = 'web';
      (global as any).navigator.serviceWorker.getRegistration = jest.fn(async () => null);
      (global as any).Notification.permission = 'granted';
      (global as any).Notification.requestPermission = jest.fn(async () => 'granted');
      ensureWebGlobals();

      const { isSupported, getToken } = require('firebase/messaging');
      isSupported.mockResolvedValue(true);
      getToken.mockResolvedValueOnce('web-token');

      const result = await ensureServiceWorkerRegistered();
      expect(result?.status).toBe('registered');
    });

    it('refreshes config when service worker is active', async () => {
      ensureWebConfigEnv();
      (Platform as any).OS = 'web';
      const activeWorker = { postMessage: jest.fn() };
      (global as any).navigator.serviceWorker.getRegistration = jest.fn(async () => ({
        active: activeWorker,
      }));
      ensureWebGlobals();

      const result = await ensureServiceWorkerRegistered();
      expect(result).toBeNull();
      expect(activeWorker.postMessage).toHaveBeenCalled();
    });

    it('returns null when service worker lookup fails', async () => {
      (Platform as any).OS = 'web';
      (global as any).navigator.serviceWorker.getRegistration = jest.fn(async () => {
        throw new Error('boom');
      });

      const result = await ensureServiceWorkerRegistered();
      expect(result).toBeNull();
    });
  });
});
