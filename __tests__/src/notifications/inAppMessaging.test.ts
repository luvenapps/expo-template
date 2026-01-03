import { Platform } from 'react-native';
import {
  __resetInAppMessagingProviderForTests,
  initializeInAppMessaging,
  pauseMessages,
  setMessageTriggers,
  allowInAppMessages,
} from '@/notifications/inAppMessaging';

jest.mock('@react-native-firebase/in-app-messaging', () => {
  const mockSetAutomaticDataCollectionEnabled = jest.fn();
  const mockSetMessagesDisplaySuppressed = jest.fn();
  const mockTriggerEvent = jest.fn();
  const mockOnMessageDisplayed = jest.fn();
  const mockOnMessageClicked = jest.fn();
  const mockOnMessageDismissed = jest.fn();
  return {
    __esModule: true,
    default: jest.fn(() => ({
      setAutomaticDataCollectionEnabled: mockSetAutomaticDataCollectionEnabled,
      setMessagesDisplaySuppressed: mockSetMessagesDisplaySuppressed,
      triggerEvent: mockTriggerEvent,
      onMessageDisplayed: mockOnMessageDisplayed,
      onMessageClicked: mockOnMessageClicked,
      onMessageDismissed: mockOnMessageDismissed,
    })),
    __mock: {
      mockSetAutomaticDataCollectionEnabled,
      mockSetMessagesDisplaySuppressed,
      mockTriggerEvent,
      mockOnMessageDisplayed,
      mockOnMessageClicked,
      mockOnMessageDismissed,
    },
  };
});

jest.mock('@/observability/AnalyticsProvider', () => {
  const trackEvent = jest.fn();
  return {
    __esModule: true,
    useAnalytics: jest.fn(() => ({
      trackEvent,
      trackError: jest.fn(),
      trackPerformance: jest.fn(),
    })),
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
    expect(iamModule.__mock.mockSetAutomaticDataCollectionEnabled).toHaveBeenCalledWith(true);
    expect(iamModule.__mock.mockSetMessagesDisplaySuppressed).toHaveBeenCalledWith(false);
    expect(iamModule.__mock.mockOnMessageDisplayed).toHaveBeenCalled();
    expect(iamModule.__mock.mockOnMessageClicked).toHaveBeenCalled();
    expect(iamModule.__mock.mockOnMessageDismissed).toHaveBeenCalled();
  });

  it('triggers events on native', async () => {
    const iamModule = jest.requireMock('@react-native-firebase/in-app-messaging');
    await setMessageTriggers({ foo: 'bar', hello: '' });
    expect(iamModule.__mock.mockTriggerEvent).toHaveBeenCalledWith('bar');
    expect(iamModule.__mock.mockTriggerEvent).toHaveBeenCalledWith('hello');
  });

  it('pauses messages on native', async () => {
    const iamModule = jest.requireMock('@react-native-firebase/in-app-messaging');
    await pauseMessages(true);
    expect(iamModule.__mock.mockSetMessagesDisplaySuppressed).toHaveBeenCalledWith(true);
  });

  it('no-ops on web', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    const iamModule = jest.requireMock('@react-native-firebase/in-app-messaging');
    iamModule.__mock.mockSetAutomaticDataCollectionEnabled.mockClear();
    iamModule.__mock.mockTriggerEvent.mockClear();
    iamModule.__mock.mockOnMessageDisplayed.mockClear();
    iamModule.__mock.mockOnMessageClicked.mockClear();
    iamModule.__mock.mockOnMessageDismissed.mockClear();

    await initializeInAppMessaging();
    await setMessageTriggers({ foo: 'bar' });
    await pauseMessages(true);

    expect(iamModule.__mock.mockSetAutomaticDataCollectionEnabled).not.toHaveBeenCalled();
    expect(iamModule.__mock.mockTriggerEvent).not.toHaveBeenCalled();
    expect(iamModule.__mock.mockOnMessageDisplayed).not.toHaveBeenCalled();
  });

  it('allows display when toggled on', async () => {
    const iamModule = jest.requireMock('@react-native-firebase/in-app-messaging');
    await allowInAppMessages();
    expect(iamModule.__mock.mockSetMessagesDisplaySuppressed).toHaveBeenCalledWith(false);
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

      expect(iamModule.__mock.mockSetAutomaticDataCollectionEnabled).toHaveBeenCalledWith(true);
    });
  });

  describe('Analytics event tracking', () => {
    it('tracks analytics events when messages are displayed', async () => {
      const analyticsModule = jest.requireMock('@/observability/AnalyticsProvider');
      const trackEvent = analyticsModule.useAnalytics().trackEvent;
      const iamModule = jest.requireMock('@react-native-firebase/in-app-messaging');

      await initializeInAppMessaging();

      // Simulate message displayed callback
      const displayedCallback = iamModule.__mock.mockOnMessageDisplayed.mock.calls[0][0];
      displayedCallback();

      expect(trackEvent).toHaveBeenCalledWith('iam:displayed');
    });

    it('tracks analytics events when messages are dismissed', async () => {
      const analyticsModule = jest.requireMock('@/observability/AnalyticsProvider');
      const trackEvent = analyticsModule.useAnalytics().trackEvent;
      const iamModule = jest.requireMock('@react-native-firebase/in-app-messaging');

      await initializeInAppMessaging();

      // Simulate message dismissed callback
      const dismissedCallback = iamModule.__mock.mockOnMessageDismissed.mock.calls[0][0];
      dismissedCallback();

      expect(trackEvent).toHaveBeenCalledWith('iam:dismissed');
    });

    it('tracks analytics events when messages are clicked', async () => {
      const analyticsModule = jest.requireMock('@/observability/AnalyticsProvider');
      const trackEvent = analyticsModule.useAnalytics().trackEvent;
      const iamModule = jest.requireMock('@react-native-firebase/in-app-messaging');

      await initializeInAppMessaging();

      // Simulate message clicked callback
      const clickedCallback = iamModule.__mock.mockOnMessageClicked.mock.calls[0][0];
      clickedCallback();

      expect(trackEvent).toHaveBeenCalledWith('iam:clicked');
    });
  });

  describe('Event listener conditional checks', () => {
    it('skips onMessageDisplayed if not available', async () => {
      __resetInAppMessagingProviderForTests();
      const iamModule = jest.requireMock('@react-native-firebase/in-app-messaging');

      // Remove onMessageDisplayed
      const mockInstance = {
        setAutomaticDataCollectionEnabled: jest.fn(),
        setMessagesDisplaySuppressed: jest.fn(),
        triggerEvent: jest.fn(),
        onMessageClicked: jest.fn(),
        onMessageDismissed: jest.fn(),
      };
      iamModule.default.mockReturnValue(mockInstance);

      await initializeInAppMessaging();

      // Should not throw, onMessageDisplayed just won't be called
      expect(mockInstance.setAutomaticDataCollectionEnabled).toHaveBeenCalledWith(true);
    });

    it('skips onMessageDismissed if not available', async () => {
      __resetInAppMessagingProviderForTests();
      const iamModule = jest.requireMock('@react-native-firebase/in-app-messaging');

      // Remove onMessageDismissed
      const mockInstance = {
        setAutomaticDataCollectionEnabled: jest.fn(),
        setMessagesDisplaySuppressed: jest.fn(),
        triggerEvent: jest.fn(),
        onMessageDisplayed: jest.fn(),
        onMessageClicked: jest.fn(),
      };
      iamModule.default.mockReturnValue(mockInstance);

      await initializeInAppMessaging();

      expect(mockInstance.setAutomaticDataCollectionEnabled).toHaveBeenCalledWith(true);
    });

    it('skips onMessageClicked if not available', async () => {
      __resetInAppMessagingProviderForTests();
      const iamModule = jest.requireMock('@react-native-firebase/in-app-messaging');

      // Remove onMessageClicked
      const mockInstance = {
        setAutomaticDataCollectionEnabled: jest.fn(),
        setMessagesDisplaySuppressed: jest.fn(),
        triggerEvent: jest.fn(),
        onMessageDisplayed: jest.fn(),
        onMessageDismissed: jest.fn(),
      };
      iamModule.default.mockReturnValue(mockInstance);

      await initializeInAppMessaging();

      expect(mockInstance.setAutomaticDataCollectionEnabled).toHaveBeenCalledWith(true);
    });
  });

  describe('Provider caching', () => {
    it('returns cached provider on subsequent calls', async () => {
      const iamModule = jest.requireMock('@react-native-firebase/in-app-messaging');
      iamModule.default.mockClear();

      // First call
      await initializeInAppMessaging();
      const firstCallCount = iamModule.default.mock.calls.length;

      // Second call - should use cached provider
      await initializeInAppMessaging();
      const secondCallCount = iamModule.default.mock.calls.length;

      // Provider module should only be called once (caching works)
      expect(secondCallCount).toBe(firstCallCount);
    });

    it('caches noop provider when Firebase is disabled', async () => {
      process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = 'false';
      __resetInAppMessagingProviderForTests();

      const iamModule = jest.requireMock('@react-native-firebase/in-app-messaging');
      iamModule.default.mockClear();

      // First call
      await initializeInAppMessaging();
      await setMessageTriggers({ test: 'event' });

      // Second call - should use cached noop provider
      await pauseMessages(true);

      // Firebase module should never be called
      expect(iamModule.default).not.toHaveBeenCalled();
    });
  });
});
