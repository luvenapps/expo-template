// Mock dependencies
let mockMessage: any = null;

const mockTrackEvent = jest.fn();
const mockBack = jest.fn();

jest.mock('@/messaging/store', () => {
  const actualModule = jest.requireActual('@/messaging/store');
  return {
    ...actualModule,
    useActiveBroadcastMessage: jest.fn(() => ({ message: mockMessage })),
    dismissBroadcastMessage: jest.fn(),
  };
});

jest.mock('@/observability/AnalyticsProvider', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
  }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
  }),
}));

// Mock UI components
jest.mock('@/ui', () => {
  const React = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  return {
    ScreenContainer: ({ children }: any) => React.createElement(RN.View, {}, children),
    PrimaryButton: ({ children, onPress }: any) =>
      React.createElement(
        RN.TouchableOpacity,
        { onPress, testID: 'primary-button' },
        React.createElement(RN.Text, {}, children),
      ),
    SecondaryButton: ({ children, onPress }: any) =>
      React.createElement(
        RN.TouchableOpacity,
        { onPress, testID: 'secondary-button' },
        React.createElement(RN.Text, {}, children),
      ),
  };
});

// Mock Tamagui
jest.mock('tamagui', () => {
  const React = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  return {
    YStack: ({ children, ...props }: any) => React.createElement(RN.View, props, children),
    Card: ({ children, ...props }: any) => React.createElement(RN.View, props, children),
    Paragraph: ({ children, ...props }: any) => React.createElement(RN.Text, props, children),
  };
});

import { render, fireEvent } from '@testing-library/react-native';
import React from 'react';
import MessagingPage from '../../../../app/(tabs)/settings/messages';
import { dismissBroadcastMessage } from '@/messaging/store';

const mockDismiss = dismissBroadcastMessage as jest.MockedFunction<typeof dismissBroadcastMessage>;

describe('MessagingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMessage = null;
    mockDismiss.mockClear();
    mockTrackEvent.mockClear();
    mockBack.mockClear();
  });

  describe('No message state', () => {
    it('renders empty state when no message is available', () => {
      mockMessage = null;
      const { getByText } = render(<MessagingPage />);
      expect(getByText('No announcements at the moment.')).toBeDefined();
    });

    it('does not render CTA or Dismiss buttons when no message', () => {
      mockMessage = null;
      const { queryByTestId } = render(<MessagingPage />);
      expect(queryByTestId('primary-button')).toBeNull();
      expect(queryByTestId('secondary-button')).toBeNull();
    });
  });

  describe('Message display', () => {
    it('renders message title and body', () => {
      mockMessage = {
        id: 'msg-1',
        title: 'Important Update',
        body: 'This is an important announcement.',
        publishedAt: '2024-01-01',
      };
      const { getByText } = render(<MessagingPage />);
      expect(getByText('Important Update')).toBeDefined();
      expect(getByText('This is an important announcement.')).toBeDefined();
    });

    it('renders default CTA label when ctaLabel is not provided', () => {
      mockMessage = {
        id: 'msg-2',
        title: 'Test',
        body: 'Test body',
        publishedAt: '2024-01-01',
      };
      const { getByText } = render(<MessagingPage />);
      expect(getByText('Got it')).toBeDefined();
    });

    it('renders custom CTA label when provided', () => {
      mockMessage = {
        id: 'msg-3',
        title: 'Test',
        body: 'Test body',
        ctaLabel: 'Learn More',
        publishedAt: '2024-01-01',
      };
      const { getByText } = render(<MessagingPage />);
      expect(getByText('Learn More')).toBeDefined();
    });

    it('renders Dismiss button', () => {
      mockMessage = {
        id: 'msg-4',
        title: 'Test',
        body: 'Test body',
        publishedAt: '2024-01-01',
      };
      const { getByText } = render(<MessagingPage />);
      expect(getByText('Dismiss message')).toBeDefined();
    });
  });

  describe('Dismiss functionality', () => {
    it('tracks dismiss event with correct parameters', () => {
      mockMessage = {
        id: 'msg-5',
        title: 'Test',
        body: 'Test body',
        publishedAt: '2024-01-01',
      };
      const { getByTestId } = render(<MessagingPage />);
      const dismissButton = getByTestId('secondary-button');
      fireEvent.press(dismissButton);

      expect(mockTrackEvent).toHaveBeenCalledWith('messaging:dismiss', {
        messageId: 'msg-5',
        source: 'detail',
      });
    });

    it('calls dismissBroadcastMessage with message id', () => {
      mockMessage = {
        id: 'msg-6',
        title: 'Test',
        body: 'Test body',
        publishedAt: '2024-01-01',
      };
      const { getByTestId } = render(<MessagingPage />);
      const dismissButton = getByTestId('secondary-button');
      fireEvent.press(dismissButton);

      expect(mockDismiss).toHaveBeenCalledWith('msg-6');
    });

    it('navigates back after dismissing', () => {
      mockMessage = {
        id: 'msg-7',
        title: 'Test',
        body: 'Test body',
        publishedAt: '2024-01-01',
      };
      const { getByTestId } = render(<MessagingPage />);
      const dismissButton = getByTestId('secondary-button');
      fireEvent.press(dismissButton);

      expect(mockBack).toHaveBeenCalled();
    });
  });

  describe('CTA functionality', () => {
    it('tracks CTA event with correct parameters', () => {
      mockMessage = {
        id: 'msg-8',
        title: 'Test',
        body: 'Test body',
        publishedAt: '2024-01-01',
      };
      const { getByTestId } = render(<MessagingPage />);
      const ctaButton = getByTestId('primary-button');
      fireEvent.press(ctaButton);

      expect(mockTrackEvent).toHaveBeenCalledWith('messaging:cta', {
        messageId: 'msg-8',
        source: 'detail',
      });
    });

    it('navigates back when CTA is pressed without ctaUrl', () => {
      mockMessage = {
        id: 'msg-9',
        title: 'Test',
        body: 'Test body',
        publishedAt: '2024-01-01',
      };
      const { getByTestId } = render(<MessagingPage />);
      const ctaButton = getByTestId('primary-button');
      fireEvent.press(ctaButton);

      expect(mockBack).toHaveBeenCalled();
    });

    it('navigates back when CTA is pressed with ctaUrl', () => {
      mockMessage = {
        id: 'msg-10',
        title: 'Test',
        body: 'Test body',
        ctaUrl: 'https://example.com',
        publishedAt: '2024-01-01',
      };
      const { getByTestId } = render(<MessagingPage />);
      const ctaButton = getByTestId('primary-button');
      fireEvent.press(ctaButton);

      expect(mockBack).toHaveBeenCalled();
    });
  });
});
