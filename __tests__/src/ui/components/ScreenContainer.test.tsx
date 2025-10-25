// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  })),
}));

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

      expect(getByTestId('ystack')).toBeDefined();
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

      const container = getByTestId('ystack');
      expect(container.props.justifyContent).toBe('center');
    });

    it('should apply default alignItems', () => {
      const { getByTestId } = render(
        <ScreenContainer>
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('ystack');
      expect(container.props.alignItems).toBe('center');
    });

    it('should apply default paddingHorizontal', () => {
      const { getByTestId } = render(
        <ScreenContainer>
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('ystack');
      expect(container.props.paddingHorizontal).toBe('$6');
    });

    it('should apply default backgroundColor', () => {
      const { getByTestId } = render(
        <ScreenContainer>
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('ystack');
      expect(container.props.backgroundColor).toBe('$background');
    });

    it('should apply flex: 1', () => {
      const { getByTestId } = render(
        <ScreenContainer>
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('ystack');
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

      const container = getByTestId('ystack');
      expect(container.props.justifyContent).toBe('flex-start');
    });

    it('should accept custom alignItems', () => {
      const { getByTestId } = render(
        <ScreenContainer alignItems="flex-end">
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('ystack');
      expect(container.props.alignItems).toBe('flex-end');
    });

    it('should accept custom paddingHorizontal as string', () => {
      const { getByTestId } = render(
        <ScreenContainer paddingHorizontal="$4">
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('ystack');
      expect(container.props.paddingHorizontal).toBe('$4');
    });

    it('should accept custom paddingHorizontal as number', () => {
      const { getByTestId } = render(
        <ScreenContainer paddingHorizontal={20}>
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('ystack');
      expect(container.props.paddingHorizontal).toBe(20);
    });

    it('should accept custom gap as string', () => {
      const { getByTestId } = render(
        <ScreenContainer gap="$3">
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('ystack');
      expect(container.props.gap).toBe('$3');
    });

    it('should accept custom gap as number', () => {
      const { getByTestId } = render(
        <ScreenContainer gap={16}>
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('ystack');
      expect(container.props.gap).toBe(16);
    });

    it('should accept custom backgroundColor', () => {
      const { getByTestId } = render(
        <ScreenContainer backgroundColor="$backgroundStrong">
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('ystack');
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

      const container = getByTestId('ystack');
      expect(container.props.paddingTop).toBe(68); // 44 + 24
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

      const container = getByTestId('ystack');
      expect(container.props.paddingBottom).toBe(58); // 34 + 24
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

      const container = getByTestId('ystack');
      expect(container.props.paddingTop).toBe(74); // 50 + 24
      expect(container.props.paddingBottom).toBe(54); // 30 + 24
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

      const container = getByTestId('ystack');
      expect(container.props.paddingTop).toBe(24); // 0 + 24
      expect(container.props.paddingBottom).toBe(24); // 0 + 24
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

      const container = getByTestId('ystack');
      expect(container.props.justifyContent).toBe('space-between');
      expect(container.props.alignItems).toBe('stretch');
      expect(container.props.paddingHorizontal).toBe('$8');
      expect(container.props.gap).toBe('$5');
      expect(container.props.backgroundColor).toBe('$backgroundHover');
      expect(container.props.paddingTop).toBe(44); // 20 + 24
      expect(container.props.paddingBottom).toBe(34); // 10 + 24
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined gap prop', () => {
      const { getByTestId } = render(
        <ScreenContainer>
          <Text>Content</Text>
        </ScreenContainer>,
      );

      const container = getByTestId('ystack');
      expect(container.props.gap).toBeUndefined();
    });

    it('should render with empty children', () => {
      const { getByTestId } = render(<ScreenContainer />);

      expect(getByTestId('ystack')).toBeDefined();
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

        const container = getByTestId('ystack');
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

        const container = getByTestId('ystack');
        expect(container.props.alignItems).toBe(value);
      });
    });
  });
});
