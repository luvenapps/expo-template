import type { ErrorReporterBackend } from '@/observability/backends/types';

type MockCrashlytics = {
  setAttribute: jest.Mock;
  recordError: jest.Mock;
  setUserId: jest.Mock;
  log: jest.Mock;
};

const loadBackend = ({
  firebaseEnabled,
  platform,
  crashlyticsModule,
}: {
  firebaseEnabled: boolean;
  platform: string;
  crashlyticsModule?: unknown;
}): { backend: ErrorReporterBackend | null; mockLogger: { warn: jest.Mock; error: jest.Mock } } => {
  const mockLogger = {
    warn: jest.fn(),
    error: jest.fn(),
  };

  jest.resetModules();
  process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = firebaseEnabled ? 'true' : 'false';

  jest.doMock('react-native', () => ({
    Platform: { OS: platform },
  }));
  jest.doMock('@/observability/logger', () => ({
    createLogger: () => mockLogger,
  }));

  if (crashlyticsModule !== undefined) {
    jest.doMock('@react-native-firebase/crashlytics', () => crashlyticsModule);
  }

  let backend: ErrorReporterBackend | null = null;
  jest.isolateModules(() => {
    const { getCrashlyticsBackend } = require('@/observability/backends/crashlyticsBackend');
    backend = getCrashlyticsBackend();
  });

  return { backend, mockLogger };
};

describe('crashlyticsBackend', () => {
  const originalEnv = process.env.EXPO_PUBLIC_TURN_ON_FIREBASE;

  afterAll(() => {
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = originalEnv;
  });

  it('returns null when Firebase is disabled', () => {
    const { backend } = loadBackend({
      firebaseEnabled: false,
      platform: 'ios',
    });
    expect(backend).toBeNull();
  });

  it('returns null on web', () => {
    const crashlytics = { default: jest.fn() };
    const { backend } = loadBackend({
      firebaseEnabled: true,
      platform: 'web',
      crashlyticsModule: crashlytics,
    });
    expect(backend).toBeNull();
  });

  it('warns when Crashlytics module is missing', () => {
    const { backend, mockLogger } = loadBackend({
      firebaseEnabled: true,
      platform: 'ios',
      crashlyticsModule: {},
    });
    expect(backend).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Native Crashlytics module not available. Rebuild the app after running: npx expo prebuild --clean',
    );
  });

  it('warns when Crashlytics initialization throws', () => {
    const mockLogger = {
      warn: jest.fn(),
      error: jest.fn(),
    };

    jest.resetModules();
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = 'true';

    jest.doMock('react-native', () => ({
      Platform: { OS: 'ios' },
    }));
    jest.doMock('@/observability/logger', () => ({
      createLogger: () => mockLogger,
    }));
    jest.doMock('@react-native-firebase/crashlytics', () => {
      throw new Error('boom');
    });

    let backend: ErrorReporterBackend | null = null;
    jest.isolateModules(() => {
      const { getCrashlyticsBackend } = require('@/observability/backends/crashlyticsBackend');
      backend = getCrashlyticsBackend();
    });

    expect(backend).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Failed to initialize Crashlytics. You may need to rebuild: npx expo prebuild --clean',
    );
  });

  it('records errors and attributes when backend is available', () => {
    const crashlyticsInstance: MockCrashlytics = {
      setAttribute: jest.fn(),
      recordError: jest.fn(),
      setUserId: jest.fn(),
      log: jest.fn(),
    };
    const crashlyticsModule = { default: jest.fn(() => crashlyticsInstance) };
    const { backend } = loadBackend({
      firebaseEnabled: true,
      platform: 'ios',
      crashlyticsModule,
    });

    const error = new Error('boom');
    backend?.recordError(error, { foo: 'bar', count: 2 });

    expect(crashlyticsInstance.setAttribute).toHaveBeenCalledWith('foo', 'bar');
    expect(crashlyticsInstance.setAttribute).toHaveBeenCalledWith('count', '2');
    expect(crashlyticsInstance.recordError).toHaveBeenCalledWith(error);
  });

  it('logs when recordError throws', () => {
    const crashlyticsInstance: MockCrashlytics = {
      setAttribute: jest.fn(() => {
        throw new Error('boom');
      }),
      recordError: jest.fn(),
      setUserId: jest.fn(),
      log: jest.fn(),
    };
    const crashlyticsModule = { default: jest.fn(() => crashlyticsInstance) };
    const { backend, mockLogger } = loadBackend({
      firebaseEnabled: true,
      platform: 'ios',
      crashlyticsModule,
    });

    backend?.recordError(new Error('boom'), { foo: 'bar' });
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to record Crashlytics error:',
      expect.any(Error),
    );
  });

  it('logs when setUserIdentifier throws', () => {
    const crashlyticsInstance: MockCrashlytics = {
      setAttribute: jest.fn(),
      recordError: jest.fn(),
      setUserId: jest.fn(() => {
        throw new Error('boom');
      }),
      log: jest.fn(),
    };
    const crashlyticsModule = { default: jest.fn(() => crashlyticsInstance) };
    const { backend, mockLogger } = loadBackend({
      firebaseEnabled: true,
      platform: 'ios',
      crashlyticsModule,
    });

    backend?.setUserIdentifier?.('user-1');
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to set Crashlytics user:',
      expect.any(Error),
    );
  });

  it('logs when logBreadcrumb throws', () => {
    const crashlyticsInstance: MockCrashlytics = {
      setAttribute: jest.fn(),
      recordError: jest.fn(),
      setUserId: jest.fn(),
      log: jest.fn(() => {
        throw new Error('boom');
      }),
    };
    const crashlyticsModule = { default: jest.fn(() => crashlyticsInstance) };
    const { backend, mockLogger } = loadBackend({
      firebaseEnabled: true,
      platform: 'ios',
      crashlyticsModule,
    });

    backend?.logBreadcrumb?.('hello', { foo: 'bar' });
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to log Crashlytics breadcrumb:',
      expect.any(Error),
    );
  });
});
