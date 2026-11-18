import type { AnalyticsBackend } from '@/observability/analyticsCore';
import type { ErrorReporterBackend } from '@/observability/backends/types';

describe('analyticsCore', () => {
  const testGlobals = global as typeof globalThis & { __DEV__: boolean };
  const originalDev = (global as any).__DEV__;
  const originalEnv = process.env.EXPO_PUBLIC_TURN_ON_FIREBASE;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  afterEach(() => {
    (global as any).__DEV__ = originalDev;
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = originalEnv;
    jest.restoreAllMocks();
    jest.dontMock('@/config/constants');
    jest.dontMock('@/observability/firebaseBackend');
    jest.dontMock('@/observability/backends/crashlyticsBackend');
  });

  const setupConsole = () => {
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  };

  it('logs envelopes in dev without firebase enabled', () => {
    (global as any).__DEV__ = true;
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = '0';
    setupConsole();

    const { trackEvent, trackError, trackPerformance, getAnalyticsDistinctId } =
      require('@/observability/analyticsCore') as typeof import('@/observability/analyticsCore');

    trackEvent('dev-event', { source: 'test' });
    trackError('boom', { section: 'tests' });
    trackPerformance({ name: 'render', durationMs: 12 });

    expect(console.info).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
    expect(getAnalyticsDistinctId()).toEqual(expect.any(String));
  });

  it('does not log in prod when firebase is disabled', () => {
    (global as any).__DEV__ = false;
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = '0';
    setupConsole();

    const { trackEvent, trackError, trackPerformance } =
      require('@/observability/analyticsCore') as typeof import('@/observability/analyticsCore');

    trackEvent('prod-event');
    trackError('prod-error');
    trackPerformance({ name: 'prod-perf', durationMs: 1 });

    expect(console.info).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('skips logging when analytics is disabled', () => {
    (global as any).__DEV__ = false;
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = 'true';
    setupConsole();

    jest.doMock('@/config/constants', () => ({
      OBSERVABILITY: {
        production: {
          errorReporting: { enabled: false },
          analytics: { enabled: false },
          appLogs: { enabled: false, batchSize: 10, flushIntervalMs: 1000 },
          performance: { enabled: false },
        },
        development: {
          errorReporting: { enabled: false },
          analytics: { enabled: false },
          appLogs: { enabled: false, batchSize: 10, flushIntervalMs: 1000 },
          performance: { enabled: false },
        },
      },
    }));

    const { trackEvent, trackError, trackPerformance } =
      require('@/observability/analyticsCore') as typeof import('@/observability/analyticsCore');

    trackEvent('disabled-event');
    trackError('disabled-error');
    trackPerformance({ name: 'disabled-perf', durationMs: 10 });

    expect(console.info).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('traces async operations and records performance', async () => {
    (global as any).__DEV__ = true;
    setupConsole();

    const analyticsCore =
      require('@/observability/analyticsCore') as typeof import('@/observability/analyticsCore');

    const result = await analyticsCore.traceAsync('trace', async () => 'ok');

    expect(result).toBe('ok');
  });

  const setupFirebaseBackends = (available = true) => {
    const analytics: jest.Mocked<AnalyticsBackend> = {
      trackEvent: jest.fn(),
      trackError: jest.fn(),
      trackPerformance: jest.fn(),
    };
    const crashlytics: jest.Mocked<ErrorReporterBackend> = {
      recordError: jest.fn(),
      setUserIdentifier: jest.fn(),
      logBreadcrumb: jest.fn(),
    };
    const getAnalytics = jest.fn(() => (available ? analytics : null));
    const getCrashlytics = jest.fn(() => (available ? crashlytics : null));
    jest.doMock('@/observability/firebaseBackend', () => ({
      getFirebaseAnalyticsBackend: getAnalytics,
    }));
    jest.doMock('@/observability/backends/crashlyticsBackend', () => ({
      getCrashlyticsBackend: getCrashlytics,
    }));
    const core =
      require('@/observability/analyticsCore') as typeof import('@/observability/analyticsCore');
    return { core, analytics, crashlytics, getAnalytics, getCrashlytics };
  };

  it('sends production events and performance metrics with a shared identity', () => {
    testGlobals.__DEV__ = false;
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = 'true';
    setupConsole();
    const { core, analytics, getAnalytics } = setupFirebaseBackends();

    core.trackEvent('saved', { count: 2 });
    core.trackPerformance({ name: 'save', durationMs: 12, metadata: { source: 'test' } });

    const distinctId = core.getAnalyticsDistinctId();
    expect(analytics.trackEvent).toHaveBeenCalledWith({
      kind: 'event',
      event: 'saved',
      payload: { count: 2 },
      timestamp: expect.any(String),
      distinctId,
    });
    expect(analytics.trackPerformance).toHaveBeenCalledWith({
      kind: 'performance',
      name: 'save',
      durationMs: 12,
      metadata: { source: 'test' },
      timestamp: expect.any(String),
      distinctId,
    });
    expect(getAnalytics).toHaveBeenCalledTimes(1);
  });

  it('reports Error objects and string errors to analytics and Crashlytics', () => {
    testGlobals.__DEV__ = false;
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = '1';
    setupConsole();
    const { core, analytics, crashlytics, getCrashlytics } = setupFirebaseBackends();
    const error = new Error('save failed');

    core.trackError(error, { operation: 'save' });
    core.trackError('retry failed');

    const distinctId = core.getAnalyticsDistinctId();
    expect(analytics.trackError).toHaveBeenNthCalledWith(1, {
      kind: 'error',
      message: error.message,
      stack: error.stack,
      metadata: { operation: 'save' },
      timestamp: expect.any(String),
      distinctId,
    });
    expect(analytics.trackError).toHaveBeenNthCalledWith(2, {
      kind: 'error',
      message: 'retry failed',
      stack: undefined,
      metadata: undefined,
      timestamp: expect.any(String),
      distinctId,
    });
    expect(crashlytics.recordError).toHaveBeenNthCalledWith(1, error, {
      operation: 'save',
      distinctId,
    });
    expect(crashlytics.recordError).toHaveBeenNthCalledWith(2, new Error('retry failed'), {
      distinctId,
    });
    expect(crashlytics.setUserIdentifier).toHaveBeenCalledWith(distinctId);
    expect(getCrashlytics).toHaveBeenCalledTimes(1);
  });

  it('handles unavailable Firebase backends without throwing or reinitializing them', () => {
    testGlobals.__DEV__ = false;
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = 'true';
    setupConsole();
    const { core, analytics, crashlytics, getAnalytics, getCrashlytics } =
      setupFirebaseBackends(false);

    expect(() => {
      core.trackEvent('saved');
      core.trackError('save failed');
      core.trackError('retry failed');
      core.trackPerformance({ name: 'save' });
    }).not.toThrow();

    expect(analytics.trackEvent).not.toHaveBeenCalled();
    expect(crashlytics.recordError).not.toHaveBeenCalled();
    expect(getAnalytics).toHaveBeenCalledTimes(1);
    expect(getCrashlytics).toHaveBeenCalledTimes(1);
  });

  it('records performance when a traced operation rejects and preserves the error', async () => {
    testGlobals.__DEV__ = false;
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = 'true';
    setupConsole();
    const { core, analytics } = setupFirebaseBackends();
    const error = new Error('operation failed');

    await expect(
      core.traceAsync('save', async () => Promise.reject(error), { source: 'test' }),
    ).rejects.toBe(error);

    expect(analytics.trackPerformance).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'save',
        durationMs: expect.any(Number),
        metadata: { source: 'test' },
      }),
    );
  });
});
