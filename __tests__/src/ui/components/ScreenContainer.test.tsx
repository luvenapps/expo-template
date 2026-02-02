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
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenContainer } from '@/ui/components/ScreenContainer';

describe('ScreenContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(
        <ScreenContainer>
          <Text>Test Content</Text>
        </ScreenContainer>,
      );

      expect(getByTestId('screen-container')).toBeDefined();
    });

    it('should render children correctly', () => {
      const { getByText } = render(
        <ScreenContainer>
          <Text>Child Component</Text>
        </ScreenContainer>,
      );

      expect(getByText('Child Component')).toBeDefined();
    });

    it('should render multiple children', () => {
      const { getByText } = render(
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
    it('should apply default justifyContent', () => {
      const { getByTestId } = render(
        <ScreenContainer>
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('screen-container');
      expect(container.props.justifyContent).toBe('flex-start');
    });

    it('should apply default alignItems', () => {
      const { getByTestId } = render(
        <ScreenContainer>
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('screen-container');
      expect(container.props.alignItems).toBe('stretch');
    });

    it('should apply default paddingHorizontal', () => {
      const { getByTestId } = render(
        <ScreenContainer>
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('screen-container');
      expect(container.props.paddingHorizontal).toBe('$6');
    });

    it('should apply default backgroundColor from palette', () => {
      const { getByTestId } = render(
        <ScreenContainer>
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('screen-container');
      expect(container.props.backgroundColor).toBe('$background');
    });

    it('should apply flex: 1', () => {
      const { getByTestId } = render(
        <ScreenContainer>
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('screen-container');
      expect(container.props.flex).toBe(1);
    });
  });

  describe('Custom Props', () => {
    it('should accept custom justifyContent', () => {
      const { getByTestId } = render(
        <ScreenContainer justifyContent="flex-start">
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('screen-container');
      expect(container.props.justifyContent).toBe('flex-start');
    });

    it('should accept custom alignItems', () => {
      const { getByTestId } = render(
        <ScreenContainer alignItems="flex-end">
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('screen-container');
      expect(container.props.alignItems).toBe('flex-end');
    });

    it('should accept custom paddingHorizontal as string', () => {
      const { getByTestId } = render(
        <ScreenContainer paddingHorizontal="$4">
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('screen-container');
      expect(container.props.paddingHorizontal).toBe('$4');
    });

    it('should accept custom paddingHorizontal as number', () => {
      const { getByTestId } = render(
        <ScreenContainer paddingHorizontal={20}>
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('screen-container');
      expect(container.props.paddingHorizontal).toBe(20);
    });

    it('should accept custom gap as string', () => {
      const { getByTestId } = render(
        <ScreenContainer gap="$3">
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('screen-container');
      expect(container.props.gap).toBe('$3');
    });

    it('should accept custom gap as number', () => {
      const { getByTestId } = render(
        <ScreenContainer gap={16}>
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('screen-container');
      expect(container.props.gap).toBe(16);
    });

    it('should accept custom backgroundColor', () => {
      const { getByTestId } = render(
        <ScreenContainer backgroundColor="$backgroundStrong">
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('screen-container');
      expect(container.props.backgroundColor).toBe('$backgroundStrong');
    });
  });

  describe('Safe Area Insets', () => {
    it('should apply safe area insets to top padding', () => {
      (useSafeAreaInsets as jest.Mock).mockReturnValue({
        top: 44,
        bottom: 0,
        left: 0,
        right: 0,
      });

      const { getByTestId } = render(
        <ScreenContainer>
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('screen-container');
      expect(container.props.paddingTop).toBe(28);
    });

    it('should apply safe area insets to bottom padding', () => {
      (useSafeAreaInsets as jest.Mock).mockReturnValue({
        top: 0,
        bottom: 34,
        left: 0,
        right: 0,
      });

      const { getByTestId } = render(
        <ScreenContainer>
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('screen-container');
      expect(container.props.paddingBottom).toBe(46);
    });

    it('should apply safe area insets to both top and bottom', () => {
      (useSafeAreaInsets as jest.Mock).mockReturnValue({
        top: 50,
        bottom: 30,
        left: 0,
        right: 0,
      });

      const { getByTestId } = render(
        <ScreenContainer>
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('screen-container');
      expect(container.props.paddingTop).toBe(28);
      expect(container.props.paddingBottom).toBe(42);
    });

    it('should add 24px base padding when insets are zero', () => {
      (useSafeAreaInsets as jest.Mock).mockReturnValue({
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      });

      const { getByTestId } = render(
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
    it('should apply all custom props together', () => {
      (useSafeAreaInsets as jest.Mock).mockReturnValue({
        top: 20,
        bottom: 10,
        left: 0,
        right: 0,
      });

      const { getByTestId } = render(
        <ScreenContainer
          justifyContent="space-between"
          alignItems="stretch"
          paddingHorizontal="$8"
          gap="$5"
          backgroundColor="$backgroundHover"
        >
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('screen-container');
      expect(container.props.justifyContent).toBe('space-between');
      expect(container.props.alignItems).toBe('stretch');
      expect(container.props.paddingHorizontal).toBe('$8');
      expect(container.props.gap).toBe('$5');
      expect(container.props.backgroundColor).toBe('$backgroundHover');
      expect(container.props.paddingTop).toBe(28);
      expect(container.props.paddingBottom).toBe(24);
    });
  });

  describe('Scrollable and Keyboard Avoiding', () => {
    it('should render with scrollable=false (non-scrollable)', () => {
      const { getByTestId } = render(
        <ScreenContainer scrollable={false}>
          <Text>Non-scrollable Content</Text>
        </ScreenContainer>,
      );

      expect(getByTestId('screen-container')).toBeDefined();
    });

    it('should render with keyboardAvoiding=false', () => {
      const { getByTestId } = render(
        <ScreenContainer keyboardAvoiding={false}>
          <Text>No Keyboard Avoiding</Text>
        </ScreenContainer>,
      );

      expect(getByTestId('screen-container')).toBeDefined();
    });

    it('should render with both scrollable=false and keyboardAvoiding=false', () => {
      const { getByTestId } = render(
        <ScreenContainer scrollable={false} keyboardAvoiding={false}>
          <Text>Static Content</Text>
        </ScreenContainer>,
      );

      expect(getByTestId('screen-container')).toBeDefined();
    });

    it('should accept contentContainerStyle prop', () => {
      const style = { paddingBottom: 100 };
      const { getByTestId } = render(
        <ScreenContainer contentContainerStyle={style}>
          <Text>Custom Style</Text>
        </ScreenContainer>,
      );

      expect(getByTestId('screen-container')).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined gap prop', () => {
      const { getByTestId } = render(
        <ScreenContainer>
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('screen-container');
      expect(container.props.gap).toBeUndefined();
    });

    it('should render with empty children', () => {
      const { getByTestId } = render(<ScreenContainer />);

      expect(getByTestId('screen-container')).toBeDefined();
    });

    it('should handle all justifyContent values', () => {
      const values: ('flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around')[] = [
        'flex-start',
        'flex-end',
        'center',
        'space-between',
        'space-around',
      ];

      values.forEach((value) => {
        const { getByTestId } = render(
          <ScreenContainer justifyContent={value}>
            <Text>Content</Text>
          </ScreenContainer>,
        );

        const container = getByTestId('screen-container');
        expect(container.props.justifyContent).toBe(value);
      });
    });

    it('should handle all alignItems values', () => {
      const values: ('flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline')[] = [
        'flex-start',
        'flex-end',
        'center',
        'stretch',
        'baseline',
      ];

      values.forEach((value) => {
        const { getByTestId } = render(
          <ScreenContainer alignItems={value}>
            <Text>Content</Text>
          </ScreenContainer>,
        );

        const container = getByTestId('screen-container');
        expect(container.props.alignItems).toBe(value);
      });
    });
  });
});
