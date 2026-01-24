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

    await provider.setContext({ id: 'user-1' });
    await provider.setContext({ id: 'user-2' });

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
});
