describe('logger', () => {
  const originalDev = (global as any).__DEV__;
  const originalEnv = process.env.EXPO_PUBLIC_ENABLE_DEBUG_LOGS;

  const loadLogger = (isDev: boolean, enableDebug: boolean) => {
    jest.resetModules();
    (global as any).__DEV__ = isDev;
    process.env.EXPO_PUBLIC_ENABLE_DEBUG_LOGS = enableDebug ? 'true' : 'false';
    return require('@/observability/logger') as typeof import('@/observability/logger');
  };

  afterEach(() => {
    (global as any).__DEV__ = originalDev;
    process.env.EXPO_PUBLIC_ENABLE_DEBUG_LOGS = originalEnv;
    jest.restoreAllMocks();
  });

  it('logs all levels in dev', () => {
    const { createLogger } = loadLogger(true, false);
    const logger = createLogger('Test');

    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    logger.debug('debug');
    logger.info('info');
    logger.warn('warn');
    logger.error('error');

    expect(console.log).toHaveBeenCalled();
    expect(console.info).toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it('suppresses debug/info in prod unless debug logs enabled', () => {
    const { createLogger } = loadLogger(false, false);
    const logger = createLogger('Test');

    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    logger.debug('debug');
    logger.info('info');
    logger.warn('warn');
    logger.error('error');

    expect(console.log).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });
});
