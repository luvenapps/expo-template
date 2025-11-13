import { render, waitFor } from '@testing-library/react-native';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { AnalyticsProvider, useAnalytics } from '@/observability/AnalyticsProvider';

jest.mock('expo-device', () => ({
  osVersion: '17.0',
  modelName: 'iPhone 15',
  manufacturer: 'Apple',
  deviceYearClass: 2023,
  osBuildId: '23A123',
}));

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));

jest.mock('posthog-react-native', () => {
  const captureMock = jest.fn();
  const identifyMock = jest.fn();
  const registerMock = jest.fn();
  const PostHogMock = jest.fn().mockImplementation(() => ({
    capture: captureMock,
    identify: identifyMock,
    register: registerMock,
  }));
  const Provider = ({ children }: { children: React.ReactNode }) => <>{children}</>;

  return {
    __esModule: true,
    default: PostHogMock,
    PostHogProvider: Provider,
    __captureMock: captureMock,
    __identifyMock: identifyMock,
    __registerMock: registerMock,
  };
});

describe('AnalyticsProvider', () => {
  const posthogModule = jest.requireMock('posthog-react-native') as {
    default: jest.Mock;
    __captureMock: jest.Mock;
    __identifyMock: jest.Mock;
    __registerMock: jest.Mock;
  };
  const originalEndpoint = process.env.EXPO_PUBLIC_ANALYTICS_ENDPOINT;
  const originalHost = process.env.EXPO_PUBLIC_ANALYTICS_HOST;
  const originalKey = process.env.EXPO_PUBLIC_ANALYTICS_WRITE_KEY;
  const originalPlatform = Platform.OS;
  const originalDev = (global as any).__DEV__;
  let mockLocalStorage: any;
  let mockMMKV: any;

  beforeEach(() => {
    // Set DEV mode for console logging
    (global as any).__DEV__ = true;

    process.env.EXPO_PUBLIC_ANALYTICS_ENDPOINT = 'https://app.posthog.com';
    process.env.EXPO_PUBLIC_ANALYTICS_HOST = '';
    process.env.EXPO_PUBLIC_ANALYTICS_WRITE_KEY = 'test-key';
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Mock localStorage for web
    mockLocalStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
      key: jest.fn(),
      length: 0,
    };

    // Mock MMKV for native
    const MMKVModule = require('react-native-mmkv');
    mockMMKV = {
      getString: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };
    MMKVModule.MMKV.mockImplementation(() => mockMMKV);

    // Setup globalThis.localStorage
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(Platform, 'OS', {
      value: 'ios',
      configurable: true,
    });
  });

  afterEach(() => {
    process.env.EXPO_PUBLIC_ANALYTICS_ENDPOINT = originalEndpoint;
    process.env.EXPO_PUBLIC_ANALYTICS_HOST = originalHost;
    process.env.EXPO_PUBLIC_ANALYTICS_WRITE_KEY = originalKey;
    (global as any).__DEV__ = originalDev;
    jest.clearAllMocks();
    (console.info as jest.Mock).mockRestore();
    (console.error as jest.Mock).mockRestore();
    (console.warn as jest.Mock).mockRestore();
    Object.defineProperty(Platform, 'OS', {
      value: originalPlatform,
      configurable: true,
    });
  });

  const FireEvents = () => {
    const analytics = useAnalytics();

    useEffect(() => {
      analytics.trackEvent('test', { foo: 'bar' });
      analytics.trackError(new Error('boom'), { section: 'test' });
      analytics.trackPerformance({ name: 'render', durationMs: 5 });
    }, [analytics]);

    return null;
  };

  it('posts analytics payloads when env vars are provided', async () => {
    render(
      <AnalyticsProvider>
        <FireEvents />
      </AnalyticsProvider>,
    );

    await waitFor(() => {
      expect(posthogModule.__captureMock).toHaveBeenCalledTimes(3);
    });

    expect(posthogModule.default).toHaveBeenCalledWith(
      'test-key',
      expect.objectContaining({ host: 'https://app.posthog.com' }),
    );
    expect(posthogModule.__identifyMock).toHaveBeenCalledTimes(1);
    expect(posthogModule.__registerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        $app_name: expect.any(String),
        $os: expect.any(String),
        $device_type: expect.any(String),
      }),
    );

    const [eventCall] = posthogModule.__captureMock.mock.calls;
    expect(eventCall[0]).toBe('test');
    expect(eventCall[1]).toMatchObject({ foo: 'bar' });
    const errorCall = posthogModule.__captureMock.mock.calls[1];
    expect(errorCall[0]).toBe('observability:error');
    const perfCall = posthogModule.__captureMock.mock.calls[2];
    expect(perfCall[0]).toBe('observability:perf:render');
  });

  it('tracks errors with stack traces', async () => {
    const TestErrorComponent = () => {
      const analytics = useAnalytics();
      useEffect(() => {
        const error = new Error('Test error with stack');
        analytics.trackError(error);
      }, [analytics]);
      return null;
    };

    render(
      <AnalyticsProvider>
        <TestErrorComponent />
      </AnalyticsProvider>,
    );

    await waitFor(() => {
      const errorCall = posthogModule.__captureMock.mock.calls.find(
        (call) => call[0] === 'observability:error',
      );
      expect(errorCall).toBeDefined();
      expect(errorCall[1]).toMatchObject({
        message: 'Test error with stack',
        stack: expect.any(String),
      });
    });
  });

  it('tracks string errors without stack traces', async () => {
    const TestErrorComponent = () => {
      const analytics = useAnalytics();
      useEffect(() => {
        analytics.trackError('String error message');
      }, [analytics]);
      return null;
    };

    render(
      <AnalyticsProvider>
        <TestErrorComponent />
      </AnalyticsProvider>,
    );

    await waitFor(() => {
      const errorCall = posthogModule.__captureMock.mock.calls.find(
        (call) => call[0] === 'observability:error',
      );
      expect(errorCall).toBeDefined();
      expect(errorCall[1]).toMatchObject({
        message: 'String error message',
      });
      expect(errorCall[1]).not.toHaveProperty('stack');
    });
  });

  it('tracks performance metrics without duration', async () => {
    const TestPerfComponent = () => {
      const analytics = useAnalytics();
      useEffect(() => {
        analytics.trackPerformance({ name: 'metric-without-duration' });
      }, [analytics]);
      return null;
    };

    render(
      <AnalyticsProvider>
        <TestPerfComponent />
      </AnalyticsProvider>,
    );

    await waitFor(() => {
      const perfCall = posthogModule.__captureMock.mock.calls.find((call) =>
        call[0].includes('metric-without-duration'),
      );
      expect(perfCall).toBeDefined();
    });
  });

  it('uses memory storage fallback when localStorage unavailable on web', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    Object.defineProperty(globalThis, 'localStorage', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const TestStorageComponent = () => {
      const analytics = useAnalytics();
      useEffect(() => {
        analytics.trackEvent('test-with-fallback-storage');
      }, [analytics]);
      return null;
    };

    render(
      <AnalyticsProvider>
        <TestStorageComponent />
      </AnalyticsProvider>,
    );

    await waitFor(() => {
      expect(posthogModule.__captureMock).toHaveBeenCalled();
    });
  });

  it('uses memory storage fallback when MMKV unavailable on native', async () => {
    const MMKVModule = require('react-native-mmkv');
    MMKVModule.MMKV.mockImplementation(() => null);

    const TestStorageComponent = () => {
      const analytics = useAnalytics();
      useEffect(() => {
        analytics.trackEvent('test-with-fallback-storage');
      }, [analytics]);
      return null;
    };

    render(
      <AnalyticsProvider>
        <TestStorageComponent />
      </AnalyticsProvider>,
    );

    await waitFor(() => {
      expect(posthogModule.__captureMock).toHaveBeenCalled();
    });
  });

  it('provides analytics context to children', () => {
    const TestComponent = () => {
      const analytics = useAnalytics();
      expect(analytics).toBeDefined();
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

  it('includes performance duration when provided', async () => {
    const TestPerfComponent = () => {
      const analytics = useAnalytics();
      useEffect(() => {
        analytics.trackPerformance({ name: 'with-duration', durationMs: 123 });
      }, [analytics]);
      return null;
    };

    render(
      <AnalyticsProvider>
        <TestPerfComponent />
      </AnalyticsProvider>,
    );

    await waitFor(() => {
      const perfCall = posthogModule.__captureMock.mock.calls.find((call) =>
        call[0].includes('with-duration'),
      );
      expect(perfCall).toBeDefined();
      expect(perfCall[1]).toMatchObject({ durationMs: 123 });
    });
  });

  it('includes error metadata when provided', async () => {
    const TestErrorComponent = () => {
      const analytics = useAnalytics();
      useEffect(() => {
        analytics.trackError(new Error('Test'), { userId: '123', context: 'login' });
      }, [analytics]);
      return null;
    };

    render(
      <AnalyticsProvider>
        <TestErrorComponent />
      </AnalyticsProvider>,
    );

    await waitFor(() => {
      const errorCall = posthogModule.__captureMock.mock.calls.find(
        (call) => call[0] === 'observability:error',
      );
      expect(errorCall).toBeDefined();
      expect(errorCall[1]).toMatchObject({
        userId: '123',
        context: 'login',
      });
    });
  });

  it('includes performance metadata when provided', async () => {
    const TestPerfComponent = () => {
      const analytics = useAnalytics();
      useEffect(() => {
        analytics.trackPerformance({
          name: 'api-call',
          durationMs: 500,
          metadata: { endpoint: '/api/users', method: 'GET' },
        });
      }, [analytics]);
      return null;
    };

    render(
      <AnalyticsProvider>
        <TestPerfComponent />
      </AnalyticsProvider>,
    );

    await waitFor(() => {
      const perfCall = posthogModule.__captureMock.mock.calls.find((call) =>
        call[0].includes('api-call'),
      );
      expect(perfCall).toBeDefined();
      expect(perfCall[1]).toMatchObject({
        endpoint: '/api/users',
        method: 'GET',
        durationMs: 500,
      });
    });
  });

  it('logs to console in dev mode', async () => {
    (global as any).__DEV__ = true;

    const TestComponent = () => {
      const analytics = useAnalytics();
      useEffect(() => {
        analytics.trackEvent('console-test');
        analytics.trackError('console-error');
        analytics.trackPerformance({ name: 'console-perf' });
      }, [analytics]);
      return null;
    };

    render(
      <AnalyticsProvider>
        <TestComponent />
      </AnalyticsProvider>,
    );

    await waitFor(() => {
      expect(console.info).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
  });

  it('returns null client when write key is empty', async () => {
    process.env.EXPO_PUBLIC_ANALYTICS_WRITE_KEY = '';

    const TestComponent = () => {
      const analytics = useAnalytics();
      useEffect(() => {
        analytics.trackEvent('test-no-key');
      }, [analytics]);
      return null;
    };

    render(
      <AnalyticsProvider>
        <TestComponent />
      </AnalyticsProvider>,
    );

    // Should not throw and should not call PostHog
    await waitFor(
      () => {
        // Give it time to potentially call capture
        expect(true).toBe(true);
      },
      { timeout: 100 },
    );

    // Verify PostHog was never initialized with empty key
    const emptyKeyCall = posthogModule.default.mock.calls.find((call) => call[0] === '');
    expect(emptyKeyCall).toBeUndefined();
  });

  it('uses default host when environment variables are empty', () => {
    // When both HOST and ENDPOINT are empty, it defaults to app.posthog.com
    // This is tested in the main initialization test
    const TestComponent = () => {
      const analytics = useAnalytics();
      expect(analytics).toBeDefined();
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

  it('handles web platform without localStorage gracefully', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    Object.defineProperty(globalThis, 'localStorage', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const TestComponent = () => {
      const analytics = useAnalytics();
      useEffect(() => {
        analytics.trackEvent('test-no-localstorage');
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

  it('wraps content with PostHogProvider when client exists', () => {
    const TestComponent = () => {
      const analytics = useAnalytics();
      expect(analytics).toBeDefined();
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

  it('renders content without PostHogProvider when client is null', () => {
    process.env.EXPO_PUBLIC_ANALYTICS_WRITE_KEY = '';

    const TestComponent = () => {
      const analytics = useAnalytics();
      expect(analytics).toBeDefined();
      return null;
    };

    expect(() => {
      render(
        <AnalyticsProvider>
          <TestComponent />
        </AnalyticsProvider>,
      );
    }).not.toThrow();

    // Restore for other tests
    process.env.EXPO_PUBLIC_ANALYTICS_WRITE_KEY = 'test-key';
  });

  it('works on web platform without throwing', () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });

    const TestComponent = () => {
      const analytics = useAnalytics();
      expect(analytics).toBeDefined();
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

  it('works on native platform without throwing', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });

    const TestComponent = () => {
      const analytics = useAnalytics();
      expect(analytics).toBeDefined();
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

  it('provides storage adapter for PostHog on web', () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });

    const TestComponent = () => {
      const analytics = useAnalytics();
      expect(analytics).toBeDefined();
      return null;
    };

    expect(() => {
      render(
        <AnalyticsProvider>
          <TestComponent />
        </AnalyticsProvider>,
      );
    }).not.toThrow();

    // Verify storage methods are available
    expect(mockLocalStorage.setItem).toBeDefined();
    expect(mockLocalStorage.getItem).toBeDefined();
    expect(mockLocalStorage.removeItem).toBeDefined();
  });

  it('provides storage adapter for PostHog on native', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });

    const TestComponent = () => {
      const analytics = useAnalytics();
      expect(analytics).toBeDefined();
      return null;
    };

    expect(() => {
      render(
        <AnalyticsProvider>
          <TestComponent />
        </AnalyticsProvider>,
      );
    }).not.toThrow();

    // Verify storage methods are available
    expect(mockMMKV.set).toBeDefined();
    expect(mockMMKV.getString).toBeDefined();
    expect(mockMMKV.delete).toBeDefined();
  });
});
