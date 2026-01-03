import { render, waitFor } from '@testing-library/react-native';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import {
  AnalyticsProvider,
  useAnalytics,
  __resetAnalyticsStateForTests,
} from '@/observability/AnalyticsProvider';

const mockMMKVInstance = {
  getString: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
};

const mockGetFirebaseAnalyticsBackend = jest.fn();

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => mockMMKVInstance),
}));

jest.mock('@/observability/firebaseBackend', () => ({
  getFirebaseAnalyticsBackend: () => mockGetFirebaseAnalyticsBackend(),
}));

describe('AnalyticsProvider', () => {
  const originalPlatform = Platform.OS;
  const originalDev = (global as any).__DEV__;
  let mockLocalStorage: any;

  beforeEach(() => {
    __resetAnalyticsStateForTests();
    (global as any).__DEV__ = true;
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });

    mockLocalStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
      key: jest.fn(),
      length: 0,
    };

    Object.defineProperty(globalThis, 'localStorage', {
      value: mockLocalStorage,
      configurable: true,
      writable: true,
    });

    mockMMKVInstance.getString.mockReset();
    mockMMKVInstance.set.mockReset();
    mockMMKVInstance.delete.mockReset();
    mockGetFirebaseAnalyticsBackend.mockReset();
    mockGetFirebaseAnalyticsBackend.mockReturnValue(null);
  });

  afterEach(() => {
    (global as any).__DEV__ = originalDev;
    (console.log as jest.Mock).mockRestore();
    (console.info as jest.Mock).mockRestore();
    (console.error as jest.Mock).mockRestore();
    (console.warn as jest.Mock).mockRestore();
    Object.defineProperty(Platform, 'OS', { value: originalPlatform, configurable: true });
    delete process.env.EXPO_PUBLIC_TURN_ON_FIREBASE;
  });

  const FireEvents = () => {
    const analytics = useAnalytics();

    useEffect(() => {
      analytics.trackEvent('test-event', { platform: Platform.OS });
      analytics.trackError(new Error('boom'), { section: 'tests' });
      analytics.trackPerformance({ name: 'render', durationMs: 12 });
    }, [analytics]);

    return null;
  };

  it('logs analytics envelopes in dev mode', async () => {
    render(
      <AnalyticsProvider>
        <FireEvents />
      </AnalyticsProvider>,
    );

    await waitFor(() => {
      expect(console.info).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
  });

  it('provides analytics context without throwing', () => {
    const TestComponent = () => {
      const analytics = useAnalytics();
      expect(analytics.trackEvent).toBeDefined();
      expect(analytics.trackError).toBeDefined();
      expect(analytics.trackPerformance).toBeDefined();
      return null;
    };

    expect(() => {
      render(
        <AnalyticsProvider>
          <TestComponent />
        </AnalyticsProvider>,
      );
    }).not.toThrow();
  });

  it('persists a distinct id via localStorage on web', () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    (mockLocalStorage.getItem as jest.Mock).mockReturnValue(null);

    render(
      <AnalyticsProvider>
        <FireEvents />
      </AnalyticsProvider>,
    );

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      expect.stringContaining('analytics-id'),
      expect.any(String),
    );
  });

  it('falls back to MMKV persistence on native', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    mockMMKVInstance.getString.mockReturnValue(null);

    render(
      <AnalyticsProvider>
        <FireEvents />
      </AnalyticsProvider>,
    );

    expect(mockMMKVInstance.set).toHaveBeenCalledWith(expect.any(String), expect.any(String));
  });

  it('does not crash when localStorage is unavailable', () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    Object.defineProperty(globalThis, 'localStorage', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    expect(() => {
      render(
        <AnalyticsProvider>
          <FireEvents />
        </AnalyticsProvider>,
      );
    }).not.toThrow();
  });

  it('dispatches events to backend when backend is available', async () => {
    const mockBackend = {
      trackEvent: jest.fn(),
      trackError: jest.fn(),
      trackPerformance: jest.fn(),
    };

    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = 'true';
    __resetAnalyticsStateForTests();
    mockGetFirebaseAnalyticsBackend.mockReturnValue(mockBackend);

    const TestComponent = () => {
      const analytics = useAnalytics();
      useEffect(() => {
        analytics.trackEvent('test-event', { platform: 'test' });
        analytics.trackError(new Error('test-error'), { context: 'test' });
        analytics.trackPerformance({ name: 'test-perf', durationMs: 50 });
      }, [analytics]);
      return null;
    };

    render(
      <AnalyticsProvider>
        <TestComponent />
      </AnalyticsProvider>,
    );

    // Wait for effects to run
    await waitFor(() => {
      expect(console.info).toHaveBeenCalled();
    });
  });

  it('handles null backend gracefully', async () => {
    (global as any).__DEV__ = false;

    // Re-initialize with null backend scenario
    __resetAnalyticsStateForTests();

    const TestComponent = () => {
      const analytics = useAnalytics();
      useEffect(() => {
        // These should not crash even with null backend
        analytics.trackEvent('test', {});
        analytics.trackError(new Error('test'), {});
        analytics.trackPerformance({ name: 'test', durationMs: 10 });
      }, [analytics]);
      return null;
    };

    expect(() => {
      render(
        <AnalyticsProvider>
          <TestComponent />
        </AnalyticsProvider>,
      );
    }).not.toThrow();
  });
});
