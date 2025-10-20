// Mock expo-router
jest.mock('expo-router', () => {
  const mockReact = jest.requireActual('react');

  const Stack = {
    Screen: ({ options }: any) => {
      return mockReact.createElement('StackScreen', {
        testID: 'stack-screen',
        options,
      });
    },
  };

  return { Stack };
});

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  })),
  SafeAreaProvider: ({ children }: any) => children,
}));

// Mock expo-status-bar
jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const mockReact = jest.requireActual('react');

  return {
    GestureHandlerRootView: ({ children, style }: any) =>
      mockReact.createElement('GestureHandlerRootView', { style }, children),
  };
});

import { render } from '@testing-library/react-native';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SettingsScreen from '../../../../app/(tabs)/settings/index';

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { UNSAFE_root } = render(<SettingsScreen />);
      expect(UNSAFE_root).toBeDefined();
    });

    it('should render Stack.Screen with correct options', () => {
      const { UNSAFE_root } = render(<SettingsScreen />);
      const stackScreen = UNSAFE_root.findByType('StackScreen' as any);

      expect(stackScreen).toBeDefined();
      expect(stackScreen.props.options.title).toBe('Settings');
      expect(stackScreen.props.options.headerShown).toBe(true);
    });

    it('should render ScreenContainer (YStack)', () => {
      const { getByTestId } = render(<SettingsScreen />);
      const ystack = getByTestId('ystack');

      expect(ystack).toBeDefined();
    });

    it('should render placeholder text', () => {
      const { getByText } = render(<SettingsScreen />);
      const text = getByText(
        'Settings content will arrive alongside sync, theme controls, and data export.',
      );

      expect(text).toBeDefined();
    });
  });

  describe('ScreenContainer Props', () => {
    it('should pass gap prop to ScreenContainer', () => {
      const { getByTestId } = render(<SettingsScreen />);
      const ystack = getByTestId('ystack');

      expect(ystack.props.gap).toBe('$3');
    });

    it('should apply default ScreenContainer styles', () => {
      const { getByTestId } = render(<SettingsScreen />);
      const ystack = getByTestId('ystack');

      expect(ystack.props.flex).toBe(1);
      expect(ystack.props.justifyContent).toBe('center');
      expect(ystack.props.alignItems).toBe('center');
      expect(ystack.props.paddingHorizontal).toBe('$6');
      expect(ystack.props.backgroundColor).toBe('$background');
    });

    it('should apply safe area insets to padding', () => {
      (useSafeAreaInsets as jest.Mock).mockReturnValue({
        top: 44,
        bottom: 34,
        left: 0,
        right: 0,
      });

      const { getByTestId } = render(<SettingsScreen />);
      const ystack = getByTestId('ystack');

      expect(ystack.props.paddingTop).toBe(68); // 44 + 24
      expect(ystack.props.paddingBottom).toBe(58); // 34 + 24
    });
  });

  describe('Text Content', () => {
    it('should display placeholder paragraph with correct styling', () => {
      const { getByTestId } = render(<SettingsScreen />);
      const paragraph = getByTestId('paragraph');

      expect(paragraph.props.textAlign).toBe('center');
      expect(paragraph.props.color).toBe('$colorMuted');
    });

    it('should display message about upcoming features', () => {
      const { getByText } = render(<SettingsScreen />);

      const text = getByText(/Settings content will arrive/i);
      expect(text).toBeDefined();
      expect(text.props.children).toContain('sync');
      expect(text.props.children).toContain('theme controls');
      expect(text.props.children).toContain('data export');
    });
  });

  describe('Component Structure', () => {
    it('should have correct component hierarchy', () => {
      const { UNSAFE_root, getByTestId } = render(<SettingsScreen />);

      // Should have Stack.Screen
      const stackScreen = UNSAFE_root.findByType('StackScreen' as any);
      expect(stackScreen).toBeDefined();

      // Should have ScreenContainer (YStack)
      const ystack = getByTestId('ystack');
      expect(ystack).toBeDefined();

      // Should have Paragraph inside YStack
      const paragraph = getByTestId('paragraph');
      expect(paragraph).toBeDefined();
    });

    it('should render exactly one Stack.Screen', () => {
      const { UNSAFE_root } = render(<SettingsScreen />);
      const stackScreens = UNSAFE_root.findAllByType('StackScreen' as any);

      expect(stackScreens).toHaveLength(1);
    });

    it('should render exactly one Paragraph', () => {
      const { getAllByTestId } = render(<SettingsScreen />);
      const paragraphs = getAllByTestId('paragraph');

      expect(paragraphs).toHaveLength(1);
    });
  });

  describe('Safe Area Insets', () => {
    it('should use safe area insets for top padding', () => {
      (useSafeAreaInsets as jest.Mock).mockReturnValue({
        top: 20,
        bottom: 0,
        left: 0,
        right: 0,
      });

      const { getByTestId } = render(<SettingsScreen />);
      const ystack = getByTestId('ystack');

      expect(ystack.props.paddingTop).toBe(44); // 20 + 24
    });

    it('should use safe area insets for bottom padding', () => {
      (useSafeAreaInsets as jest.Mock).mockReturnValue({
        top: 0,
        bottom: 30,
        left: 0,
        right: 0,
      });

      const { getByTestId } = render(<SettingsScreen />);
      const ystack = getByTestId('ystack');

      expect(ystack.props.paddingBottom).toBe(54); // 30 + 24
    });

    it('should handle zero insets correctly', () => {
      (useSafeAreaInsets as jest.Mock).mockReturnValue({
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      });

      const { getByTestId } = render(<SettingsScreen />);
      const ystack = getByTestId('ystack');

      expect(ystack.props.paddingTop).toBe(24); // 0 + 24
      expect(ystack.props.paddingBottom).toBe(24); // 0 + 24
    });
  });
});
