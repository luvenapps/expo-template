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
});
