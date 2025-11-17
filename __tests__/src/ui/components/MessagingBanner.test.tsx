// Mock dependencies
let mockMessage: any = null;
const mockTrackEvent = jest.fn();
const mockPush = jest.fn();

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
    push: mockPush,
  }),
}));

jest.mock('expo-linking', () => ({
  __esModule: true,
  openURL: jest.fn(),
}));

// Mock Tamagui
jest.mock('tamagui', () => {
  const React = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  return {
    Card: ({ children, ...props }: any) =>
      React.createElement(RN.View, { ...props, testID: 'card' }, children),
    YStack: ({ children, ...props }: any) => React.createElement(RN.View, props, children),
    XStack: ({ children, ...props }: any) => React.createElement(RN.View, props, children),
    Paragraph: ({ children, ...props }: any) => React.createElement(RN.Text, props, children),
    Button: ({ children, onPress, ...props }: any) =>
      React.createElement(
        RN.TouchableOpacity,
        { onPress, testID: props.testID || 'button' },
        React.createElement(RN.Text, {}, children),
      ),
  };
});

import { render, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { MessagingBanner } from '../../../../src/ui/components/MessagingBanner';
import { dismissBroadcastMessage } from '@/messaging/store';
import * as Linking from 'expo-linking';

const mockDismiss = dismissBroadcastMessage as jest.MockedFunction<typeof dismissBroadcastMessage>;
const mockLinkingOpenURL = Linking.openURL as jest.MockedFunction<typeof Linking.openURL>;

describe('MessagingBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMessage = null;
    mockLinkingOpenURL.mockResolvedValue(true);
    mockDismiss.mockClear();
    mockTrackEvent.mockClear();
    mockPush.mockClear();
  });

  describe('Rendering', () => {
    it('returns null when no message is available', () => {
      mockMessage = null;
      const { queryByTestId } = render(<MessagingBanner />);
      expect(queryByTestId('card')).toBeNull();
    });

    it('renders message title and body', () => {
      mockMessage = {
        id: 'msg-1',
        title: 'Important Update',
        body: 'This is an important announcement.',
        publishedAt: '2024-01-01',
      };
      const { getByText } = render(<MessagingBanner />);
      expect(getByText('Important Update')).toBeDefined();
      expect(getByText('This is an important announcement.')).toBeDefined();
    });

    it('renders default CTA label when not provided', () => {
      mockMessage = {
        id: 'msg-2',
        title: 'Test',
        body: 'Body',
        publishedAt: '2024-01-01',
      };
      const { getByText } = render(<MessagingBanner />);
      expect(getByText('Learn more')).toBeDefined();
    });

    it('renders custom CTA label when provided', () => {
      mockMessage = {
        id: 'msg-3',
        title: 'Test',
        body: 'Body',
        ctaLabel: 'Read More',
        publishedAt: '2024-01-01',
      };
      const { getByText } = render(<MessagingBanner />);
      expect(getByText('Read More')).toBeDefined();
    });

    it('renders Dismiss button', () => {
      mockMessage = {
        id: 'msg-4',
        title: 'Test',
        body: 'Body',
        publishedAt: '2024-01-01',
      };
      const { getByText } = render(<MessagingBanner />);
      expect(getByText('Dismiss')).toBeDefined();
    });
  });

  describe('Analytics tracking', () => {
    it('tracks impression when message is shown', () => {
      mockMessage = {
        id: 'msg-5',
        title: 'Test',
        body: 'Body',
        publishedAt: '2024-01-01',
      };
      render(<MessagingBanner />);

      expect(mockTrackEvent).toHaveBeenCalledWith('messaging:impression', {
        messageId: 'msg-5',
        audience: 'broadcast',
      });
    });

    it('tracks impression only once per message ID', () => {
      mockMessage = {
        id: 'msg-6',
        title: 'Test',
        body: 'Body',
        publishedAt: '2024-01-01',
      };

      const { rerender } = render(<MessagingBanner />);
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);

      // Rerender with same message
      rerender(<MessagingBanner />);
      expect(mockTrackEvent).toHaveBeenCalledTimes(1); // Still 1, not 2
    });

    it('tracks new impression when message ID changes', () => {
      mockMessage = {
        id: 'msg-7',
        title: 'First',
        body: 'Body',
        publishedAt: '2024-01-01',
      };

      const { rerender } = render(<MessagingBanner />);
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent).toHaveBeenCalledWith('messaging:impression', {
        messageId: 'msg-7',
        audience: 'broadcast',
      });

      // Change message ID
      mockMessage = {
        id: 'msg-8',
        title: 'Second',
        body: 'Body',
        publishedAt: '2024-01-02',
      };

      rerender(<MessagingBanner />);
      expect(mockTrackEvent).toHaveBeenCalledTimes(2);
      expect(mockTrackEvent).toHaveBeenCalledWith('messaging:impression', {
        messageId: 'msg-8',
        audience: 'broadcast',
      });
    });
  });

  describe('CTA button', () => {
    it('tracks CTA event when clicked', () => {
      mockMessage = {
        id: 'msg-9',
        title: 'Test',
        body: 'Body',
        publishedAt: '2024-01-01',
      };

      const { getByText } = render(<MessagingBanner />);
      const ctaButton = getByText('Learn more');

      fireEvent.press(ctaButton);

      expect(mockTrackEvent).toHaveBeenCalledWith('messaging:cta', {
        messageId: 'msg-9',
      });
    });

    it('opens URL when ctaUrl is provided', () => {
      mockMessage = {
        id: 'msg-10',
        title: 'Test',
        body: 'Body',
        ctaUrl: 'https://example.com',
        publishedAt: '2024-01-01',
      };

      const { getByText } = render(<MessagingBanner />);
      const ctaButton = getByText('Learn more');

      fireEvent.press(ctaButton);

      expect(mockLinkingOpenURL).toHaveBeenCalledWith('https://example.com');
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('navigates to messages page when ctaUrl is not provided', () => {
      mockMessage = {
        id: 'msg-11',
        title: 'Test',
        body: 'Body',
        publishedAt: '2024-01-01',
      };

      const { getByText } = render(<MessagingBanner />);
      const ctaButton = getByText('Learn more');

      fireEvent.press(ctaButton);

      expect(mockPush).toHaveBeenCalledWith('/(tabs)/settings/messages');
      expect(mockLinkingOpenURL).not.toHaveBeenCalled();
    });

    it('handles URL open errors gracefully', () => {
      mockMessage = {
        id: 'msg-12',
        title: 'Test',
        body: 'Body',
        ctaUrl: 'https://example.com',
        publishedAt: '2024-01-01',
      };

      mockLinkingOpenURL.mockRejectedValue(new Error('Failed to open URL'));

      const { getByText } = render(<MessagingBanner />);
      const ctaButton = getByText('Learn more');

      // Should not throw
      expect(() => fireEvent.press(ctaButton)).not.toThrow();
    });
  });

  describe('Dismiss button', () => {
    it('tracks dismiss event when clicked', () => {
      mockMessage = {
        id: 'msg-13',
        title: 'Test',
        body: 'Body',
        publishedAt: '2024-01-01',
      };

      const { getByText } = render(<MessagingBanner />);
      const dismissButton = getByText('Dismiss');

      fireEvent.press(dismissButton);

      expect(mockTrackEvent).toHaveBeenCalledWith('messaging:dismiss', {
        messageId: 'msg-13',
      });
    });

    it('calls dismissBroadcastMessage with message ID', () => {
      mockMessage = {
        id: 'msg-14',
        title: 'Test',
        body: 'Body',
        publishedAt: '2024-01-01',
      };

      const { getByText } = render(<MessagingBanner />);
      const dismissButton = getByText('Dismiss');

      fireEvent.press(dismissButton);

      expect(mockDismiss).toHaveBeenCalledWith('msg-14');
    });
  });
});
