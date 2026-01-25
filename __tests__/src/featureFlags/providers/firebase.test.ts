const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

jest.mock('@/observability/logger', () => ({
  createLogger: () => mockLogger,
}));

const appStateListeners: ((state: string) => void)[] = [];

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
  AppState: {
    addEventListener: jest.fn((_event: string, listener: (state: string) => void) => {
      appStateListeners.push(listener);
      return { remove: jest.fn() };
    }),
  },
}));

let mockShouldThrowRemoteConfig = false;
let mockOnConfigUpdatedAvailable = true;
let mockActivateShouldFail = false;
let mockFetchShouldFail = false;
let mockFetchShouldReturnFalse = false;
let mockFetchShouldDelay = false;
let mockFetchDeferred: { resolve: (value: boolean) => void } | null = null;
let mockRawStringValue = 'true';
let mockSetDefaultsShouldFail = false;
let mockOnConfigUpdatedShouldThrow = false;

const remoteConfigState = {
  listener: null as null | ((event?: { updatedKeys?: string[] }) => void | Promise<void>),
  instance: null as null | {
    setConfigSettings: jest.Mock;
    setDefaults: jest.Mock;
    fetchAndActivate: jest.Mock;
    activate: jest.Mock;
    getValue: jest.Mock;
    onConfigUpdated?: jest.Mock;
  },
};

jest.mock('@react-native-firebase/remote-config', () => ({
  __esModule: true,
  default: () => {
    if (mockShouldThrowRemoteConfig) {
      throw new Error('no remote config');
    }
    const instance = {
      setConfigSettings: jest.fn().mockResolvedValue(undefined),
      setDefaults: jest.fn().mockImplementation(() => {
        if (mockSetDefaultsShouldFail) {
          return Promise.reject(new Error('defaults failed'));
        }
        return Promise.resolve();
      }),
      fetchAndActivate: jest.fn().mockImplementation(() => {
        if (mockFetchShouldFail) {
          return Promise.reject(new Error('fetch failed'));
        }
        if (mockFetchShouldReturnFalse) {
          return Promise.resolve(false);
        }
        if (mockFetchShouldDelay) {
          return new Promise<boolean>((resolve) => {
            mockFetchDeferred = { resolve };
          });
        }
        return Promise.resolve(true);
      }),
      activate: jest.fn().mockImplementation(() => {
        if (mockActivateShouldFail) {
          return Promise.reject(new Error('activate failed'));
        }
        return Promise.resolve(true);
      }),
      getValue: jest.fn(() => ({
        asBoolean: () => true,
        asNumber: () => 42,
        asString: () => mockRawStringValue,
        getSource: () => 'default',
      })),
      onConfigUpdated: mockOnConfigUpdatedAvailable
        ? jest.fn((listener) => {
            if (mockOnConfigUpdatedShouldThrow) {
              throw new Error('listener failed');
            }
            remoteConfigState.listener = listener;
            return jest.fn();
          })
        : undefined,
    };
    remoteConfigState.instance = instance;
    return instance;
  },
}));

const { createFirebaseProvider } = require('@/featureFlags/providers/firebase');

describe('featureFlags firebase provider', () => {
  beforeEach(() => {
    remoteConfigState.listener = null;
    remoteConfigState.instance = null;
    appStateListeners.length = 0;
    jest.clearAllMocks();
    mockShouldThrowRemoteConfig = false;
    mockOnConfigUpdatedAvailable = true;
    mockActivateShouldFail = false;
    mockFetchShouldFail = false;
    mockFetchShouldReturnFalse = false;
    mockFetchShouldDelay = false;
    mockFetchDeferred = null;
    mockRawStringValue = 'true';
    mockSetDefaultsShouldFail = false;
    mockOnConfigUpdatedShouldThrow = false;
  });

  it('initializes remote config and fetches', async () => {
    const provider = createFirebaseProvider();
    await provider.ready();

    expect(provider.getStatus()).toBe('ready');
  });

  it('notifies listeners on real-time updates with changed keys', async () => {
    const provider = createFirebaseProvider();
    await provider.ready();

    const listener = jest.fn();
    provider.subscribe(listener);

    await remoteConfigState.listener?.({ updatedKeys: ['test_feature_flag'] });

    expect(listener).toHaveBeenCalledWith('test_feature_flag');
    provider.destroy();
  });

  it('does not notify after unsubscribe or destroy', async () => {
    const provider = createFirebaseProvider();
    await provider.ready();

    const listener = jest.fn();
    const unsubscribe = provider.subscribe(listener);
    unsubscribe();
    provider.destroy();

    await remoteConfigState.listener?.({ updatedKeys: ['test_feature_flag'] });

    expect(listener).not.toHaveBeenCalled();
  });

  it('refreshes on foreground and respects subscription cleanup', async () => {
    const provider = createFirebaseProvider();
    await provider.ready();

    expect(appStateListeners.length).toBe(1);

    appStateListeners[0]?.('active');

    provider.destroy();
  });

  it('skips notifying when destroyed before refresh completes', async () => {
    const provider = createFirebaseProvider();
    await provider.ready();

    const listener = jest.fn();
    provider.subscribe(listener);

    mockFetchShouldDelay = true;
    const refreshPromise = provider.refresh();
    provider.destroy();

    mockFetchDeferred?.resolve(true);
    await refreshPromise;

    expect(listener).not.toHaveBeenCalled();
  });

  it('does not notify when fetch returns no activation', async () => {
    mockFetchShouldReturnFalse = true;
    const provider = createFirebaseProvider();
    await provider.ready();

    const listener = jest.fn();
    provider.subscribe(listener);

    await provider.refresh();

    expect(listener).not.toHaveBeenCalled();
    provider.destroy();
  });

  it('falls back to defaults when remote config is unavailable', async () => {
    mockShouldThrowRemoteConfig = true;
    const provider = createFirebaseProvider();
    await provider.ready();

    expect(provider.getFlag('test_feature_flag', true)).toBe(true);
    await provider.refresh();
  });

  it('handles real-time updates without changed keys', async () => {
    const provider = createFirebaseProvider();
    await provider.ready();

    const listener = jest.fn();
    provider.subscribe(listener);

    await remoteConfigState.listener?.({ updatedKeys: [] });

    expect(listener).toHaveBeenCalled();
    provider.destroy();
  });

  it('handles real-time updates with non-array payloads', async () => {
    const provider = createFirebaseProvider();
    await provider.ready();

    const listener = jest.fn();
    provider.subscribe(listener);

    await remoteConfigState.listener?.({ updatedKeys: 'test_feature_flag' as never });

    expect(listener).toHaveBeenCalled();
    provider.destroy();
  });

  it('filters out unknown keys in real-time updates', async () => {
    const provider = createFirebaseProvider();
    await provider.ready();

    const listener = jest.fn();
    provider.subscribe(listener);

    await remoteConfigState.listener?.({ updatedKeys: ['unknown_flag'] });

    expect(listener).toHaveBeenCalled();
    provider.destroy();
  });

  it('filters mixed known and unknown keys', async () => {
    const provider = createFirebaseProvider();
    await provider.ready();

    const listener = jest.fn();
    provider.subscribe(listener);

    await remoteConfigState.listener?.({ updatedKeys: ['test_feature_flag', 'unknown_flag'] });

    expect(listener).toHaveBeenCalledWith('test_feature_flag');
    provider.destroy();
  });

  it('logs when real-time activation fails', async () => {
    mockActivateShouldFail = true;
    const provider = createFirebaseProvider();
    await provider.ready();

    const listener = jest.fn();
    provider.subscribe(listener);

    await remoteConfigState.listener?.({ updatedKeys: ['test_feature_flag'] });

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Failed to activate real-time update',
      expect.any(Error),
    );
    expect(listener).not.toHaveBeenCalled();
    provider.destroy();
  });

  it('skips foreground refresh when recently fetched', async () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1000);
    const provider = createFirebaseProvider();
    await provider.ready();

    appStateListeners[0]?.('active');

    expect(mockLogger.debug).toHaveBeenCalledWith('Skipping foreground refresh (too recent)');
    provider.destroy();
    nowSpy.mockRestore();
  });

  it('logs warning on foreground refresh failure', async () => {
    mockFetchShouldFail = true;
    const provider = createFirebaseProvider();
    await provider.ready();

    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(10_000);
    appStateListeners[0]?.('active');

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Foreground refresh failed, using cached/defaults',
      expect.any(Error),
    );
    provider.destroy();
    nowSpy.mockRestore();
  });

  it('returns parsed object flag values', async () => {
    mockRawStringValue = JSON.stringify({ enabled: true });
    const provider = createFirebaseProvider();
    await provider.ready();

    const value = provider.getFlag('test_feature_flag', { enabled: false });
    expect(value).toEqual({ enabled: true });
  });

  it('returns parsed values for boolean, number, and string fallbacks', async () => {
    const provider = createFirebaseProvider();
    await provider.ready();

    expect(provider.getFlag('test_feature_flag', true)).toBe(true);
    expect(provider.getFlag('test_feature_flag', 10)).toBe(42);
    expect(provider.getFlag('test_feature_flag', 'fallback')).toBe('true');
  });

  it('uses default when fallback is undefined', async () => {
    mockShouldThrowRemoteConfig = true;
    const provider = createFirebaseProvider();
    await provider.ready();

    const value = provider.getFlag('test_feature_flag', undefined as unknown as boolean);
    expect(value).toBe(false);
  });

  it('falls back to defaults when JSON parsing fails', async () => {
    mockRawStringValue = '{not-json';
    const provider = createFirebaseProvider();
    await provider.ready();

    const value = provider.getFlag('test_feature_flag', { enabled: false });
    expect(value).toEqual({ enabled: false });
  });

  it('falls back to defaults when remote value is empty', async () => {
    mockRawStringValue = '';
    const provider = createFirebaseProvider();
    await provider.ready();

    const value = provider.getFlag('test_feature_flag', { enabled: false });
    expect(value).toEqual({ enabled: false });
  });

  it('logs context once when setContext is used', async () => {
    const provider = createFirebaseProvider();
    await provider.ready();

    mockLogger.debug.mockClear(); // Clear initialization debug logs

    await provider.setContext({ id: 'user-1' });
    await provider.setContext({ id: 'user-2' });

    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Remote Config ignores user context (SDK has no per-user targeting).',
    );
    expect(mockLogger.debug).toHaveBeenCalledTimes(1);
  });

  it('handles missing real-time listener API', async () => {
    mockOnConfigUpdatedAvailable = false;
    const provider = createFirebaseProvider();
    await provider.ready();

    expect(mockLogger.warn).toHaveBeenCalledWith('Real-time listener not available');
  });

  it('avoids duplicate listener registrations', async () => {
    const provider = createFirebaseProvider();
    await provider.ready();
    await provider.ready();

    expect(remoteConfigState.instance).not.toBeNull();
    expect(remoteConfigState.instance?.onConfigUpdated).toHaveBeenCalledTimes(1);
    provider.destroy();
  });

  it('logs when real-time listener registration fails', async () => {
    mockOnConfigUpdatedShouldThrow = true;
    const provider = createFirebaseProvider();
    await provider.ready();

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Real-time listener not available',
      expect.any(Error),
    );
  });

  it('handles init failure and still becomes ready', async () => {
    mockSetDefaultsShouldFail = true;
    const provider = createFirebaseProvider();
    await provider.ready();

    expect(provider.getStatus()).toBe('ready');
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Remote Config init failed, using cached/defaults',
      expect.any(Error),
    );
  });

  it('ignores non-active AppState transitions', async () => {
    const provider = createFirebaseProvider();
    await provider.ready();

    appStateListeners[0]?.('background');

    expect(mockLogger.debug).not.toHaveBeenCalledWith('Skipping foreground refresh (too recent)');
    provider.destroy();
  });

  it('registers AppState listener only once', async () => {
    const provider = createFirebaseProvider();
    await provider.ready();
    await provider.ready();

    const { AppState } = require('react-native');
    expect(AppState.addEventListener).toHaveBeenCalledTimes(1);
    provider.destroy();
  });

  it('uses production fetch interval when __DEV__ is false', async () => {
    await new Promise<void>((resolve) => {
      jest.isolateModules(() => {
        const runtime = globalThis as typeof globalThis & { __DEV__?: boolean };
        const originalDev = runtime.__DEV__;
        runtime.__DEV__ = false;

        const {
          createFirebaseProvider: createProvider,
        } = require('@/featureFlags/providers/firebase');
        const provider = createProvider();

        provider.ready().then(() => {
          expect(remoteConfigState.instance?.setConfigSettings).toHaveBeenCalledWith({
            minimumFetchIntervalMillis: 60 * 1000,
          });
          runtime.__DEV__ = originalDev;
          resolve();
        });
      });
    });
  });

  it('skips foreground setup after destruction', async () => {
    const provider = createFirebaseProvider();
    provider.destroy();

    await provider.ready();

    expect(appStateListeners.length).toBe(0);
  });

  it('tests getSource when remoteConfig is null', () => {
    mockShouldThrowRemoteConfig = true;
    const provider = createFirebaseProvider();
    const source = provider.getSource('test_feature_flag');
    expect(source).toBe('default');
    mockShouldThrowRemoteConfig = false;
  });

  it('tests getSource when getValue throws', () => {
    const provider = createFirebaseProvider();

    return provider.ready().then(() => {
      // Mock getValue to throw
      if (remoteConfigState.instance) {
        remoteConfigState.instance.getValue.mockImplementationOnce(() => {
          throw new Error('getValue failed');
        });
      }

      const source = provider.getSource('test_feature_flag');
      expect(source).toBe('default');
    });
  });

  it('ignores concurrent real-time updates', async () => {
    const provider = createFirebaseProvider();
    await provider.ready();

    const listener = jest.fn();
    provider.subscribe(listener);

    // First update - should process
    const firstUpdatePromise = remoteConfigState.listener?.({ updatedKeys: ['test_feature_flag'] });

    // Second update while first is processing - should be ignored
    const secondUpdatePromise = remoteConfigState.listener?.({
      updatedKeys: ['test_feature_flag'],
    });

    await Promise.all([firstUpdatePromise, secondUpdatePromise]);

    // Only one update should have been processed
    expect(mockLogger.debug).toHaveBeenCalledWith('Ignoring concurrent real-time update');
  });

  it('ignores duplicate real-time updates within 500ms', async () => {
    const provider = createFirebaseProvider();
    await provider.ready();

    const listener = jest.fn();
    provider.subscribe(listener);

    // First update
    await remoteConfigState.listener?.({ updatedKeys: ['test_feature_flag'] });

    // Second update immediately after (within 500ms) - should be ignored
    await remoteConfigState.listener?.({ updatedKeys: ['test_feature_flag'] });

    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Ignoring duplicate real-time update (too recent)',
    );
  });

  it('does not notify listeners when destroyed during real-time update', async () => {
    const provider = createFirebaseProvider();
    await provider.ready();

    const listener = jest.fn();
    provider.subscribe(listener);

    // Destroy the provider
    provider.destroy();

    // Try to trigger a real-time update - should not notify
    await remoteConfigState.listener?.({ updatedKeys: ['test_feature_flag'] });

    // Listener should not be called because provider is destroyed
    expect(listener).not.toHaveBeenCalled();
  });

  it('tests getSource returns value from remote config', async () => {
    const provider = createFirebaseProvider();
    await provider.ready();

    // Mock getValue to return a source
    if (remoteConfigState.instance) {
      remoteConfigState.instance.getValue.mockImplementationOnce(() => ({
        asBoolean: jest.fn(),
        asNumber: jest.fn(),
        asString: jest.fn(),
        getSource: jest.fn(() => 'remote'),
      }));
    }

    const source = provider.getSource('test_feature_flag');
    expect(source).toBe('remote');
  });

  it('logs when fetch completes with no new values', async () => {
    const provider = createFirebaseProvider();
    await provider.ready();

    mockLogger.info.mockClear();
    mockFetchShouldReturnFalse = true;
    await provider.refresh();

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Remote Config fetch completed, no new values',
      expect.any(Object),
    );
    provider.destroy();
  });

  it('uses web remote config when Platform.OS is web', async () => {
    const warnSpy = mockLogger.warn;
    const debugSpy = mockLogger.debug;
    const infoSpy = mockLogger.info;

    const envBackup = { ...process.env };
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY = 'api';
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN = 'auth';
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = 'project';
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET = 'bucket';
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = 'sender';
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID = 'app';
    process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID = 'measure';

    const deleteApp = jest.fn();
    const getApps = jest.fn(() => [{ name: 'app-1' }, { name: 'app-2' }]);
    const initializeApp = jest.fn(() => ({ name: 'app-1' }));
    const getRemoteConfig = jest.fn(() => ({
      settings: { minimumFetchIntervalMillis: 0 },
      defaultConfig: {},
    }));
    const webFetchAndActivate = jest.fn().mockResolvedValue(true);
    const webActivate = jest.fn().mockResolvedValue(true);
    const webGetValue = jest.fn(() => ({
      asBoolean: () => true,
      asNumber: () => 7,
      asString: () => 'ok',
      getSource: () => 'remote',
    }));

    const webDefaultsSet: Record<string, string | number | boolean> = {};

    getRemoteConfig.mockImplementation(() => ({
      settings: { minimumFetchIntervalMillis: 0 },
      defaultConfig: webDefaultsSet,
    }));

    const originalWindow = globalThis.window;
    (globalThis as unknown as { window?: Window }).window = {
      location: { href: 'http://localhost' },
    } as Window;

    jest.resetModules();
    jest.doMock('@/observability/logger', () => ({
      createLogger: () => mockLogger,
    }));
    jest.doMock('react-native', () => ({
      Platform: { OS: 'web' },
      AppState: {
        addEventListener: jest.fn((_event: string, listener: (state: string) => void) => {
          appStateListeners.push(listener);
          return { remove: jest.fn() };
        }),
      },
    }));
    jest.doMock('firebase/app', () => ({
      initializeApp,
      getApps,
      deleteApp,
    }));
    jest.doMock('firebase/remote-config', () => ({
      getRemoteConfig,
      fetchAndActivate: webFetchAndActivate,
      activate: webActivate,
      getValue: webGetValue,
    }));

    const { createFirebaseProvider: createProvider } = require('@/featureFlags/providers/firebase');
    const provider = createProvider();
    await provider.ready();
    await provider.refresh();
    await provider.setContext({ id: 'user-1' });

    expect(initializeApp).toHaveBeenCalled();
    expect(getRemoteConfig).toHaveBeenCalled();
    expect(webFetchAndActivate).toHaveBeenCalled();
    expect(webActivate).toHaveBeenCalled();
    expect(debugSpy).toHaveBeenCalledWith('Web Remote Config initialized', {
      projectId: 'project',
      appId: 'app',
    });
    expect(infoSpy).toHaveBeenCalledWith('Remote Config initialized successfully');
    expect(warnSpy).not.toHaveBeenCalledWith('Web Remote Config not available (no window)');

    provider.destroy();
    expect(deleteApp).toHaveBeenCalled();

    process.env = envBackup;
    (globalThis as unknown as { window?: Window }).window = originalWindow;
  });

  it('returns null for web remote config when window is missing', async () => {
    const envBackup = { ...process.env };
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY = 'api';
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN = 'auth';
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = 'project';
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET = 'bucket';
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = 'sender';
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID = 'app';
    process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID = 'measure';

    const originalWindow = globalThis.window;
    (globalThis as unknown as { window?: Window }).window = undefined;

    jest.resetModules();
    jest.doMock('@/observability/logger', () => ({
      createLogger: () => mockLogger,
    }));
    jest.doMock('react-native', () => ({
      Platform: { OS: 'web' },
      AppState: {
        addEventListener: jest.fn((_event: string, listener: (state: string) => void) => {
          appStateListeners.push(listener);
          return { remove: jest.fn() };
        }),
      },
    }));
    jest.doMock('firebase/app', () => ({}));
    jest.doMock('firebase/remote-config', () => ({}));

    const { createFirebaseProvider: createProvider } = require('@/featureFlags/providers/firebase');
    const provider = createProvider();
    await provider.ready();

    expect(mockLogger.warn).toHaveBeenCalledWith('Web Remote Config not available (no window)');

    process.env = envBackup;
    (globalThis as unknown as { window?: Window }).window = originalWindow;
  });

  it('returns null for web remote config with incomplete config', async () => {
    const envBackup = { ...process.env };
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY = '';
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = '';
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID = '';

    const originalWindow = globalThis.window;
    (globalThis as unknown as { window?: Window }).window = {
      location: { href: 'http://localhost' },
    } as Window;

    jest.resetModules();
    jest.doMock('@/observability/logger', () => ({
      createLogger: () => mockLogger,
    }));
    jest.doMock('react-native', () => ({
      Platform: { OS: 'web' },
      AppState: {
        addEventListener: jest.fn((_event: string, listener: (state: string) => void) => {
          appStateListeners.push(listener);
          return { remove: jest.fn() };
        }),
      },
    }));
    jest.doMock('firebase/app', () => ({}));
    jest.doMock('firebase/remote-config', () => ({}));

    const { createFirebaseProvider: createProvider } = require('@/featureFlags/providers/firebase');
    const provider = createProvider();
    await provider.ready();

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Web config incomplete, Remote Config disabled',
      expect.objectContaining({
        hasApiKey: false,
        hasProjectId: false,
        hasAppId: false,
      }),
    );

    process.env = envBackup;
    (globalThis as unknown as { window?: Window }).window = originalWindow;
  });

  it('handles web remote config init failures', async () => {
    const envBackup = { ...process.env };
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY = 'api';
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN = 'auth';
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = 'project';
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET = 'bucket';
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = 'sender';
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID = 'app';
    process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID = 'measure';

    const originalWindow = globalThis.window;
    (globalThis as unknown as { window?: Window }).window = {
      location: { href: 'http://localhost' },
    } as Window;

    jest.resetModules();
    jest.doMock('@/observability/logger', () => ({
      createLogger: () => mockLogger,
    }));
    jest.doMock('react-native', () => ({
      Platform: { OS: 'web' },
      AppState: {
        addEventListener: jest.fn((_event: string, listener: (state: string) => void) => {
          appStateListeners.push(listener);
          return { remove: jest.fn() };
        }),
      },
    }));
    jest.doMock('firebase/app', () => {
      throw new Error('boom');
    });

    const { createFirebaseProvider: createProvider } = require('@/featureFlags/providers/firebase');
    const provider = createProvider();
    await provider.ready();

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Web Remote Config initialization failed',
      expect.any(Error),
    );

    process.env = envBackup;
    (globalThis as unknown as { window?: Window }).window = originalWindow;
  });
});
