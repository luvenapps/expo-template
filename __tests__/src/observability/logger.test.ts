describe('logger', () => {
  const originalDev = (global as any).__DEV__;
  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;

  const loadLogger = (isDev: boolean) => {
    jest.resetModules();
    (global as any).__DEV__ = isDev;
    return require('@/observability/logger') as typeof import('@/observability/logger');
  };

  afterEach(() => {
    (global as any).__DEV__ = originalDev;
    globalThis.window = originalWindow as typeof globalThis.window;
    globalThis.localStorage = originalLocalStorage as typeof globalThis.localStorage;
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it('logs all levels in dev', () => {
    const { createLogger } = loadLogger(true);
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
    const { createLogger } = loadLogger(false);
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

  it('logs debug/info in prod when debug logs enabled', () => {
    const { createLogger, setDebugLogsEnabled } = loadLogger(false);
    const logger = createLogger('Test');

    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    setDebugLogsEnabled(true);

    logger.debug('debug');
    logger.info('info');
    logger.warn('warn');
    logger.error('error');

    expect(console.log).toHaveBeenCalled();
    expect(console.info).toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it('reads debug flag from localStorage and reacts to storage updates on web', () => {
    jest.resetModules();
    jest.doMock('react-native', () => ({
      Platform: { OS: 'web' },
      Linking: {},
    }));

    const setItem = jest.fn();
    const getItem = jest.fn(() => 'false');
    const removeItem = jest.fn();
    const addEventListener = jest.fn();
    const storageListeners: ((event: StorageEvent) => void)[] = [];

    addEventListener.mockImplementation((_, callback) => {
      storageListeners.push(callback);
    });

    globalThis.localStorage = { setItem, getItem, removeItem } as unknown as Storage;
    globalThis.window = {
      location: { href: 'https://example.com/?debug-logs=true' },
      addEventListener,
    } as unknown as typeof globalThis.window;

    const { createLogger, getDebugLogsEnabled } =
      require('@/observability/logger') as typeof import('@/observability/logger');
    createLogger('Test');

    expect(getDebugLogsEnabled()).toBe(true);

    const { DOMAIN } = require('@/config/domain.config') as typeof import('@/config/domain.config');
    const storageKey = `${DOMAIN.app.storageKey}-debug-logs-enabled`;
    storageListeners[0]?.({
      key: storageKey,
      newValue: 'false',
    } as StorageEvent);

    expect(getDebugLogsEnabled()).toBe(false);
  });

  it('uses MMKV storage for native debug flag', () => {
    jest.resetModules();
    jest.doMock('react-native', () => ({
      Platform: { OS: 'ios' },
      Linking: {},
    }));

    const getString = jest.fn(() => 'true');
    const set = jest.fn();
    const mockMMKV = jest.fn(() => ({ getString, set }));

    jest.doMock('react-native-mmkv', () => ({
      MMKV: mockMMKV,
    }));

    const { createLogger, getDebugLogsEnabled, setDebugLogsEnabled } =
      require('@/observability/logger') as typeof import('@/observability/logger');
    createLogger('Test');

    expect(getDebugLogsEnabled()).toBe(true);

    setDebugLogsEnabled(false);
    const { DOMAIN } = require('@/config/domain.config') as typeof import('@/config/domain.config');
    const storageKey = `${DOMAIN.app.storageKey}-debug-logs-enabled`;
    expect(set).toHaveBeenCalledWith(storageKey, 'false');
  });

  it('handles localStorage failures on web', () => {
    jest.resetModules();
    jest.doMock('react-native', () => ({
      Platform: { OS: 'web' },
      Linking: {},
    }));

    const getItem = jest.fn(() => {
      throw new Error('read failed');
    });
    const setItem = jest.fn(() => {
      throw new Error('write failed');
    });
    const addEventListener = jest.fn();

    globalThis.localStorage = { getItem, setItem } as unknown as Storage;
    globalThis.window = {
      location: { href: '' },
      addEventListener,
    } as unknown as typeof globalThis.window;

    const { createLogger, getDebugLogsEnabled, setDebugLogsEnabled } =
      require('@/observability/logger') as typeof import('@/observability/logger');
    createLogger('Test');

    expect(getDebugLogsEnabled()).toBe(false);
    expect(() => setDebugLogsEnabled(true)).not.toThrow();
  });

  it('parses enabled param on native deep links', async () => {
    jest.resetModules();
    jest.doMock('react-native', () => ({
      Platform: { OS: 'ios' },
      Linking: {
        getInitialURL: jest
          .fn()
          .mockResolvedValue(
            `${require('@/config/domain.config').DOMAIN.app.name}://debug-logs?enabled=false`,
          ),
        addEventListener: jest.fn(),
      },
    }));

    const getString = jest.fn(() => 'true');
    const mockMMKV = jest.fn(() => ({ getString, set: jest.fn() }));

    jest.doMock('react-native-mmkv', () => ({
      MMKV: mockMMKV,
    }));

    const { createLogger, getDebugLogsEnabled } =
      require('@/observability/logger') as typeof import('@/observability/logger');

    createLogger('Test');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(getDebugLogsEnabled()).toBe(false);
  });

  it('ignores debug-logs URLs without a value', async () => {
    jest.resetModules();
    jest.doMock('react-native', () => ({
      Platform: { OS: 'ios' },
      Linking: {
        getInitialURL: jest
          .fn()
          .mockResolvedValue(`${require('@/config/domain.config').DOMAIN.app.name}://debug-logs`),
        addEventListener: jest.fn(),
      },
    }));

    const getString = jest.fn(() => 'true');
    const mockMMKV = jest.fn(() => ({ getString, set: jest.fn() }));

    jest.doMock('react-native-mmkv', () => ({
      MMKV: mockMMKV,
    }));

    const { createLogger, getDebugLogsEnabled } =
      require('@/observability/logger') as typeof import('@/observability/logger');

    createLogger('Test');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(getDebugLogsEnabled()).toBe(true);
  });

  it('handles MMKV load failures on native', () => {
    jest.resetModules();
    jest.doMock('react-native', () => ({
      Platform: { OS: 'ios' },
      Linking: {},
    }));

    jest.doMock('react-native-mmkv', () => {
      throw new Error('nope');
    });

    const { createLogger, setDebugLogsEnabled } =
      require('@/observability/logger') as typeof import('@/observability/logger');

    createLogger('Test');
    expect(() => setDebugLogsEnabled(true)).not.toThrow();
  });
});
