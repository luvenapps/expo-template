describe('analyticsCore', () => {
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
});
