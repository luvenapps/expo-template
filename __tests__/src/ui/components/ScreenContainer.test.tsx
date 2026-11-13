import { findByType } from '../../../helpers/testInstance';

jest.mock('react-native/Libraries/Components/Keyboard/KeyboardAvoidingView', () => {
  const React = jest.requireActual('react');

  return {
    __esModule: true,
    default: ({ children, ...props }: any) =>
      React.createElement('KeyboardAvoidingView', props, children),
  };
});

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  })),
}));

// Mock ThemeProvider
jest.mock('@/ui/theme/ThemeProvider', () => {
  const { themePalettes } = jest.requireActual('@/ui/theme/palette');
  return {
    useThemeContext: jest.fn(() => ({
      resolvedTheme: 'light',
      palette: {
        background: themePalettes.light.background,
        text: themePalettes.light.text,
        mutedText: themePalettes.light.mutedText,
      },
    })),
    useOptionalThemeContext: jest.fn(() => ({
      resolvedTheme: 'light',
      palette: {
        background: themePalettes.light.background,
        text: themePalettes.light.text,
        mutedText: themePalettes.light.mutedText,
      },
    })),
  };
});

import { render } from '@testing-library/react-native';
import React from 'react';
import { Platform, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenContainer } from '@/ui/components/ScreenContainer';

describe('ScreenContainer', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalPlatform });
  });

  describe('Rendering', () => {
    it('should render without crashing', async () => {
      const { getByTestId } = await render(
        <ScreenContainer>
          <Text>Test Content</Text>
        </ScreenContainer>,
      );

      expect(getByTestId('screen-container')).toBeDefined();
    });

    it('should render children correctly', async () => {
      const { getByText } = await render(
        <ScreenContainer>
          <Text>Child Component</Text>
        </ScreenContainer>,
      );

      expect(getByText('Child Component')).toBeDefined();
    });

    it('should render multiple children', async () => {
      const { getByText } = await render(
        <ScreenContainer>
          <Text>First Child</Text>
          <Text>Second Child</Text>
          <Text>Third Child</Text>
        </ScreenContainer>,
      );

      expect(getByText('First Child')).toBeDefined();
      expect(getByText('Second Child')).toBeDefined();
      expect(getByText('Third Child')).toBeDefined();
    });
  });

  describe('Default Props', () => {
    it('should apply default justifyContent', async () => {
      const { getByTestId } = await render(
        <ScreenContainer>
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('screen-container');
      expect(container.props.justifyContent).toBe('flex-start');
    });

    it('should apply default alignItems', async () => {
      const { getByTestId } = await render(
        <ScreenContainer>
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('screen-container');
      expect(container.props.alignItems).toBe('stretch');
    });

    it('should apply default paddingHorizontal', async () => {
      const { getByTestId } = await render(
        <ScreenContainer>
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('screen-container');
      expect(container.props.paddingHorizontal).toBe('6');
    });

    it('should apply default backgroundColor from palette', async () => {
      const { getByTestId } = await render(
        <ScreenContainer>
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('screen-container');
      expect(container.props.backgroundColor).toBe('background');
    });

    it('should apply flex: 1', async () => {
      const { getByTestId } = await render(
        <ScreenContainer>
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('screen-container');
      expect(container.props.flex).toBe(1);
    });
  });

  describe('Custom Props', () => {
    it('should accept custom justifyContent', async () => {
      const { getByTestId } = await render(
        <ScreenContainer justifyContent="flex-start">
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('screen-container');
      expect(container.props.justifyContent).toBe('flex-start');
    });

    it('should accept custom alignItems', async () => {
      const { getByTestId } = await render(
        <ScreenContainer alignItems="flex-end">
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('screen-container');
      expect(container.props.alignItems).toBe('flex-end');
    });

    it('should accept custom paddingHorizontal as string', async () => {
      const { getByTestId } = await render(
        <ScreenContainer paddingHorizontal="4">
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('screen-container');
      expect(container.props.paddingHorizontal).toBe('4');
    });

    it('should accept custom paddingHorizontal as number', async () => {
      const { getByTestId } = await render(
        <ScreenContainer paddingHorizontal={20}>
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('screen-container');
      expect(container.props.paddingHorizontal).toBe(20);
    });

    it('should accept custom gap as string', async () => {
      const { getByTestId } = await render(
        <ScreenContainer gap="$3">
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('screen-container');
      expect(container.props.gap).toBe('$3');
    });

    it('should accept custom gap as number', async () => {
      const { getByTestId } = await render(
        <ScreenContainer gap={16}>
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('screen-container');
      expect(container.props.gap).toBe(16);
    });

    it('should accept custom backgroundColor', async () => {
      const { getByTestId } = await render(
        <ScreenContainer backgroundColor="backgroundStrong">
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('screen-container');
      expect(container.props.backgroundColor).toBe('backgroundStrong');
    });

    it('should accept non-token backgroundColor values', async () => {
      const { getByTestId } = await render(
        <ScreenContainer backgroundColor="#123456">
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('screen-container');
      expect(container.props.backgroundColor).toBe('#123456');
    });
  });

  describe('Safe Area Insets', () => {
    it('should apply safe area insets to top padding', async () => {
      (useSafeAreaInsets as jest.Mock).mockReturnValue({
        top: 44,
        bottom: 0,
        left: 0,
        right: 0,
      });

      const { getByTestId } = await render(
        <ScreenContainer>
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('screen-container');
      expect(container.props.paddingTop).toBe(28);
    });

    it('should apply safe area insets to bottom padding', async () => {
      (useSafeAreaInsets as jest.Mock).mockReturnValue({
        top: 0,
        bottom: 34,
        left: 0,
        right: 0,
      });

      const { getByTestId } = await render(
        <ScreenContainer>
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('screen-container');
      expect(container.props.paddingBottom).toBe(46);
    });

    it('should apply safe area insets to both top and bottom', async () => {
      (useSafeAreaInsets as jest.Mock).mockReturnValue({
        top: 50,
        bottom: 30,
        left: 0,
        right: 0,
      });

      const { getByTestId } = await render(
        <ScreenContainer>
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('screen-container');
      expect(container.props.paddingTop).toBe(28);
      expect(container.props.paddingBottom).toBe(42);
    });

    it('should add 24px base padding when insets are zero', async () => {
      (useSafeAreaInsets as jest.Mock).mockReturnValue({
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      });

      const { getByTestId } = await render(
        <ScreenContainer>
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('screen-container');
      expect(container.props.paddingTop).toBe(16);
      expect(container.props.paddingBottom).toBe(24);
    });
  });

  describe('Props Combinations', () => {
    it('should apply all custom props together', async () => {
      (useSafeAreaInsets as jest.Mock).mockReturnValue({
        top: 20,
        bottom: 10,
        left: 0,
        right: 0,
      });

      const { getByTestId } = await render(
        <ScreenContainer
          justifyContent="space-between"
          alignItems="stretch"
          paddingHorizontal="8"
          gap="$5"
          backgroundColor="background-hover"
        >
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('screen-container');
      expect(container.props.justifyContent).toBe('space-between');
      expect(container.props.alignItems).toBe('stretch');
      expect(container.props.paddingHorizontal).toBe('8');
      expect(container.props.gap).toBe('$5');
      expect(container.props.backgroundColor).toBe('background-hover');
      expect(container.props.paddingTop).toBe(28);
      expect(container.props.paddingBottom).toBe(24);
    });
  });

  describe('Scrollable and Keyboard Avoiding', () => {
    it('should render with scrollable=false (non-scrollable)', async () => {
      const { getByTestId } = await render(
        <ScreenContainer scrollable={false}>
          <Text>Non-scrollable Content</Text>
        </ScreenContainer>,
      );

      expect(getByTestId('screen-container')).toBeDefined();
    });

    it('should render with keyboardAvoiding=false', async () => {
      const { getByTestId } = await render(
        <ScreenContainer keyboardAvoiding={false}>
          <Text>No Keyboard Avoiding</Text>
        </ScreenContainer>,
      );

      expect(getByTestId('screen-container')).toBeDefined();
    });

    it('should use height behavior for non-ios keyboard avoiding', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'android' });
      const { container } = await render(
        <ScreenContainer>
          <Text>Android Keyboard</Text>
        </ScreenContainer>,
      );

      const keyboardView = findByType(container, 'KeyboardAvoidingView');
      expect(keyboardView.props.behavior).toBe('height');
    });

    it('should render with both scrollable=false and keyboardAvoiding=false', async () => {
      const { getByTestId } = await render(
        <ScreenContainer scrollable={false} keyboardAvoiding={false}>
          <Text>Static Content</Text>
        </ScreenContainer>,
      );

      expect(getByTestId('screen-container')).toBeDefined();
    });

    it('should accept contentContainerStyle prop', async () => {
      const style = { paddingBottom: 100 };
      const { getByTestId } = await render(
        <ScreenContainer contentContainerStyle={style}>
          <Text>Custom Style</Text>
        </ScreenContainer>,
      );

      expect(getByTestId('screen-container')).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined gap prop', async () => {
      const { getByTestId } = await render(
        <ScreenContainer>
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('screen-container');
      expect(container.props.gap).toBeUndefined();
    });

    it('should render with empty children', async () => {
      const { getByTestId } = await render(<ScreenContainer />);

      expect(getByTestId('screen-container')).toBeDefined();
    });

    it('should handle all justifyContent values', async () => {
      const values: ('flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around')[] = [
        'flex-start',
        'flex-end',
        'center',
        'space-between',
        'space-around',
      ];

      for (const value of values) {
        const { getByTestId } = await render(
          <ScreenContainer justifyContent={value}>
            <Text>Content</Text>
          </ScreenContainer>,
        );

        const container = getByTestId('screen-container');
        expect(container.props.justifyContent).toBe(value);
      }
    });

    it('should handle all alignItems values', async () => {
      const values: ('flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline')[] = [
        'flex-start',
        'flex-end',
        'center',
        'stretch',
        'baseline',
      ];

      for (const value of values) {
        const { getByTestId } = await render(
          <ScreenContainer alignItems={value}>
            <Text>Content</Text>
          </ScreenContainer>,
        );

        const container = getByTestId('screen-container');
        expect(container.props.alignItems).toBe(value);
      }
    });
  });
});
