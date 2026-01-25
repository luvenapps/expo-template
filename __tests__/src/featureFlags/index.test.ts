import { Platform } from 'react-native';

describe('featureFlags index', () => {
  const originalOS = Platform.OS;
  const originalFlag = process.env.EXPO_PUBLIC_TURN_ON_FIREBASE;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS, writable: true });
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = originalFlag;
  });

  it('uses fallback defaults when firebase runtime flag is off', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = 'false';

    jest.isolateModules(() => {
      const { getFlag } = require('@/featureFlags');
      // Fallback provider returns the provided fallback when flag doesn't exist
      const value = getFlag('nonexistent_flag' as never, true);
      expect(value).toBe(true);
    });
  });

  it('uses firebase provider on native when runtime flag is on', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = 'true';

    jest.isolateModules(() => {
      const mockClient = {
        ready: jest.fn().mockResolvedValue(undefined),
        getStatus: jest.fn().mockReturnValue('ready'),
        getFlag: jest.fn().mockReturnValue(true),
        getSource: jest.fn().mockReturnValue('default'),
        setContext: jest.fn().mockResolvedValue(undefined),
        refresh: jest.fn().mockResolvedValue(undefined),
        subscribe: jest.fn(() => jest.fn()),
        destroy: jest.fn(),
      };

      jest.doMock('@/featureFlags/providers/firebase', () => ({
        createFirebaseProvider: jest.fn(() => mockClient),
      }));
      jest.doMock('@/featureFlags/providers/fallback', () => ({
        createFallbackProvider: jest.fn(() => mockClient),
      }));

      const { getFeatureFlagClient } = require('@/featureFlags');
      const client = getFeatureFlagClient();
      expect(client).toBe(mockClient);
    });
  });

  it('accepts runtime flag value "1" for firebase', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = '1';

    jest.isolateModules(() => {
      const mockClient = {
        ready: jest.fn().mockResolvedValue(undefined),
        getStatus: jest.fn().mockReturnValue('ready'),
        getFlag: jest.fn().mockReturnValue(true),
        getSource: jest.fn().mockReturnValue('default'),
        setContext: jest.fn().mockResolvedValue(undefined),
        refresh: jest.fn().mockResolvedValue(undefined),
        subscribe: jest.fn(() => jest.fn()),
        destroy: jest.fn(),
      };

      const mockFirebase = jest.fn(() => mockClient);
      jest.doMock('@/featureFlags/providers/firebase', () => ({
        createFirebaseProvider: mockFirebase,
      }));
      jest.doMock('@/featureFlags/providers/fallback', () => ({
        createFallbackProvider: jest.fn(() => mockClient),
      }));

      const { getFeatureFlagClient, __setFeatureFlagClientForTests } = require('@/featureFlags');
      __setFeatureFlagClientForTests(null);
      const client = getFeatureFlagClient();
      expect(client).toBe(mockClient);
      expect(mockFirebase).toHaveBeenCalledTimes(1);
    });
  });

  it('swallows errors from client.ready', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = 'false';

    await new Promise<void>((resolve) => {
      jest.isolateModules(() => {
        const mockClient = {
          ready: jest.fn().mockRejectedValue(new Error('ready failed')),
          getStatus: jest.fn().mockReturnValue('ready'),
          getFlag: jest.fn().mockReturnValue(true),
          getSource: jest.fn().mockReturnValue('default'),
          setContext: jest.fn().mockResolvedValue(undefined),
          refresh: jest.fn().mockResolvedValue(undefined),
          subscribe: jest.fn(() => jest.fn()),
          destroy: jest.fn(),
        };

        jest.doMock('@/featureFlags/providers/fallback', () => ({
          createFallbackProvider: jest.fn(() => mockClient),
        }));

        const { getFeatureFlagClient, __setFeatureFlagClientForTests } = require('@/featureFlags');
        __setFeatureFlagClientForTests(null);
        getFeatureFlagClient();
        setImmediate(resolve);
      });
    });
  });

  it('uses firebase provider on web when runtime flag is on', () => {
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = 'true';

    jest.isolateModules(() => {
      jest.doMock('react-native', () => ({
        Platform: { OS: 'web' },
      }));

      const mockClient = {
        ready: jest.fn().mockResolvedValue(undefined),
        getStatus: jest.fn().mockReturnValue('ready'),
        getFlag: jest.fn().mockReturnValue(true),
        getSource: jest.fn().mockReturnValue('default'),
        setContext: jest.fn().mockResolvedValue(undefined),
        refresh: jest.fn().mockResolvedValue(undefined),
        subscribe: jest.fn(() => jest.fn()),
        destroy: jest.fn(),
      };

      const mockFallback = jest.fn(() => mockClient);
      const mockFirebase = jest.fn(() => mockClient);
      jest.doMock('@/featureFlags/providers/fallback', () => ({
        createFallbackProvider: mockFallback,
      }));
      jest.doMock('@/featureFlags/providers/firebase', () => ({
        createFirebaseProvider: mockFirebase,
      }));

      const { getFeatureFlagClient, __setFeatureFlagClientForTests } = require('@/featureFlags');
      __setFeatureFlagClientForTests(null);
      const client = getFeatureFlagClient();
      expect(client).toBe(mockClient);
      expect(mockFirebase).toHaveBeenCalled();
    });
  });

  it('cleans up client on hot reload dispose and accept', () => {
    const runtime = globalThis as typeof globalThis & { __DEV__?: boolean };
    const originalDev = runtime.__DEV__;
    runtime.__DEV__ = true;
    const mockClient = {
      ready: jest.fn().mockResolvedValue(undefined),
      getStatus: jest.fn().mockReturnValue('ready'),
      getFlag: jest.fn().mockReturnValue(true),
      getSource: jest.fn().mockReturnValue('default'),
      setContext: jest.fn().mockResolvedValue(undefined),
      refresh: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn(() => jest.fn()),
      destroy: jest.fn(),
    };

    const hot = {
      dispose: jest.fn(),
      accept: jest.fn(),
    };

    jest.isolateModules(() => {
      const {
        __setFeatureFlagClientForTests,
        __setupHotReloadForTests,
      } = require('@/featureFlags');
      __setFeatureFlagClientForTests(mockClient);
      __setupHotReloadForTests(hot);
    });

    const disposeCallback = hot.dispose.mock.calls[0][0];
    disposeCallback();
    expect(mockClient.destroy).toHaveBeenCalledTimes(1);

    // Re-seed client for accept path
    const hotSecond = {
      dispose: jest.fn(),
      accept: jest.fn(),
    };

    jest.isolateModules(() => {
      const {
        __setFeatureFlagClientForTests,
        __setupHotReloadForTests,
      } = require('@/featureFlags');
      __setFeatureFlagClientForTests(mockClient);
      __setupHotReloadForTests(hotSecond);
    });

    const acceptCallback = hotSecond.accept.mock.calls[0][0];
    acceptCallback();
    expect(mockClient.destroy).toHaveBeenCalledTimes(2);

    runtime.__DEV__ = originalDev;
  });
});
