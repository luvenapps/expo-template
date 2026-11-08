import { Platform } from 'react-native';
import {
  __resetInAppMessagingProviderForTests,
  initializeInAppMessaging,
  pauseMessages,
  setMessageTriggers,
  allowInAppMessages,
} from '@/notifications/inAppMessaging';

let mockShouldThrowModuleLoad = false;

jest.mock('@react-native-firebase/in-app-messaging', () => {
  if (mockShouldThrowModuleLoad) {
    throw new Error('native module unavailable');
  }
  const mockGetInAppMessaging = jest.fn(() => ({}));
  const mockSetAutomaticDataCollectionEnabled = jest.fn();
  const mockSetMessagesDisplaySuppressed = jest.fn();
  const mockTriggerEvent = jest.fn();
  return {
    __esModule: true,
    getInAppMessaging: mockGetInAppMessaging,
    setAutomaticDataCollectionEnabled: mockSetAutomaticDataCollectionEnabled,
    setMessagesDisplaySuppressed: mockSetMessagesDisplaySuppressed,
    triggerEvent: mockTriggerEvent,
    __mock: {
      mockGetInAppMessaging,
      mockSetAutomaticDataCollectionEnabled,
      mockSetMessagesDisplaySuppressed,
      mockTriggerEvent,
    },
  };
});
describe('inAppMessaging', () => {
  const originalPlatform = Platform.OS;
  const originalEnv = process.env.EXPO_PUBLIC_TURN_ON_FIREBASE;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = 'true';
    __resetInAppMessagingProviderForTests();
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
  });

  afterEach(() => {
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = originalEnv;
    Object.defineProperty(Platform, 'OS', { value: originalPlatform, configurable: true });
  });

  it('initializes IAM on native', async () => {
    const iamModule = jest.requireMock('@react-native-firebase/in-app-messaging');
    await initializeInAppMessaging();
    expect(iamModule.__mock.mockGetInAppMessaging).toHaveBeenCalledTimes(1);
    expect(iamModule.__mock.mockSetAutomaticDataCollectionEnabled).toHaveBeenCalledWith(
      expect.anything(),
      true,
    );
    expect(iamModule.__mock.mockSetMessagesDisplaySuppressed).toHaveBeenCalledWith(
      expect.anything(),
      false,
    );
  });

  it('triggers events on native', async () => {
    const iamModule = jest.requireMock('@react-native-firebase/in-app-messaging');
    await setMessageTriggers({ foo: 'bar', hello: '' });
    expect(iamModule.__mock.mockTriggerEvent).toHaveBeenCalledWith(expect.anything(), 'bar');
    expect(iamModule.__mock.mockTriggerEvent).toHaveBeenCalledWith(expect.anything(), 'hello');
  });

  it('pauses messages on native', async () => {
    const iamModule = jest.requireMock('@react-native-firebase/in-app-messaging');
    await pauseMessages(true);
    expect(iamModule.__mock.mockSetMessagesDisplaySuppressed).toHaveBeenCalledWith(
      expect.anything(),
      true,
    );
  });

  it('no-ops on web', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    const iamModule = jest.requireMock('@react-native-firebase/in-app-messaging');
    iamModule.__mock.mockSetAutomaticDataCollectionEnabled.mockClear();
    iamModule.__mock.mockTriggerEvent.mockClear();

    await initializeInAppMessaging();
    await setMessageTriggers({ foo: 'bar' });
    await pauseMessages(true);
    await allowInAppMessages();

    expect(iamModule.__mock.mockSetAutomaticDataCollectionEnabled).not.toHaveBeenCalled();
    expect(iamModule.__mock.mockTriggerEvent).not.toHaveBeenCalled();
  });

  it('uses the noop provider when the native module cannot be loaded', async () => {
    let isolatedProvider: typeof import('@/notifications/inAppMessaging') | undefined;
    mockShouldThrowModuleLoad = true;
    jest.resetModules();
    try {
      jest.isolateModules(() => {
        isolatedProvider = require('@/notifications/inAppMessaging');
      });

      await isolatedProvider?.initializeInAppMessaging();
      await isolatedProvider?.allowInAppMessages();

      expect(isolatedProvider).toBeDefined();
    } finally {
      mockShouldThrowModuleLoad = false;
      jest.resetModules();
    }
  });

  it('allows display when toggled on', async () => {
    const iamModule = jest.requireMock('@react-native-firebase/in-app-messaging');
    await allowInAppMessages();
    expect(iamModule.__mock.mockSetMessagesDisplaySuppressed).toHaveBeenCalledWith(
      expect.anything(),
      false,
    );
  });

  describe('Firebase disabled scenarios', () => {
    it('uses noop provider when EXPO_PUBLIC_TURN_ON_FIREBASE is false', async () => {
      process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = 'false';
      __resetInAppMessagingProviderForTests();

      const iamModule = jest.requireMock('@react-native-firebase/in-app-messaging');
      iamModule.__mock.mockSetAutomaticDataCollectionEnabled.mockClear();
      iamModule.__mock.mockTriggerEvent.mockClear();

      await initializeInAppMessaging();
      await setMessageTriggers({ test: 'event' });
      await pauseMessages(true);

      expect(iamModule.__mock.mockSetAutomaticDataCollectionEnabled).not.toHaveBeenCalled();
      expect(iamModule.__mock.mockTriggerEvent).not.toHaveBeenCalled();
    });

    it('uses noop provider when EXPO_PUBLIC_TURN_ON_FIREBASE is undefined', async () => {
      delete process.env.EXPO_PUBLIC_TURN_ON_FIREBASE;
      __resetInAppMessagingProviderForTests();

      const iamModule = jest.requireMock('@react-native-firebase/in-app-messaging');
      iamModule.__mock.mockSetAutomaticDataCollectionEnabled.mockClear();

      await initializeInAppMessaging();

      expect(iamModule.__mock.mockSetAutomaticDataCollectionEnabled).not.toHaveBeenCalled();
    });

    it('recognizes "1" as Firebase enabled', async () => {
      process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = '1';
      __resetInAppMessagingProviderForTests();

      const iamModule = jest.requireMock('@react-native-firebase/in-app-messaging');
      await initializeInAppMessaging();

      expect(iamModule.__mock.mockSetAutomaticDataCollectionEnabled).toHaveBeenCalledWith(
        expect.anything(),
        true,
      );
    });
  });

  describe('Provider caching', () => {
    it('returns cached provider on subsequent calls', async () => {
      const iamModule = jest.requireMock('@react-native-firebase/in-app-messaging');
      iamModule.__mock.mockGetInAppMessaging.mockClear();

      // First call
      await initializeInAppMessaging();
      const firstCallCount = iamModule.__mock.mockGetInAppMessaging.mock.calls.length;

      // Second call - should use cached provider
      await initializeInAppMessaging();
      const secondCallCount = iamModule.__mock.mockGetInAppMessaging.mock.calls.length;

      // Provider module should only be called once (caching works)
      expect(secondCallCount).toBe(firstCallCount);
    });

    it('caches noop provider when Firebase is disabled', async () => {
      process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = 'false';
      __resetInAppMessagingProviderForTests();

      const iamModule = jest.requireMock('@react-native-firebase/in-app-messaging');
      iamModule.__mock.mockGetInAppMessaging.mockClear();

      // First call
      await initializeInAppMessaging();
      await setMessageTriggers({ test: 'event' });

      // Second call - should use cached noop provider
      await pauseMessages(true);

      // Firebase module should never be called
      expect(iamModule.__mock.mockGetInAppMessaging).not.toHaveBeenCalled();
    });
  });
});
