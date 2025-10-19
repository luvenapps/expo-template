import React from 'react';
import { render } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { AppProviders } from '../../../../src/ui/providers/AppProviders';

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const mockReact = jest.requireActual('react');
  return {
    GestureHandlerRootView: ({ children, style }: any) =>
      mockReact.createElement(
        'GestureHandlerRootView',
        { testID: 'gesture-handler-root', style },
        children,
      ),
  };
});

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => {
    const mockReact = jest.requireActual('react');
    return mockReact.createElement('SafeAreaProvider', { testID: 'safe-area-provider' }, children);
  },
}));

// Mock expo-status-bar
jest.mock('expo-status-bar', () => ({
  StatusBar: ({ style }: any) => {
    const mockReact = jest.requireActual('react');
    return mockReact.createElement('StatusBar', { testID: 'status-bar', style });
  },
}));

describe('AppProviders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { UNSAFE_root } = render(
        <AppProviders>
          <Text>Test Content</Text>
        </AppProviders>,
      );

      expect(UNSAFE_root).toBeDefined();
    });

    it('should render children correctly', () => {
      const { getByText } = render(
        <AppProviders>
          <Text>Child Component</Text>
        </AppProviders>,
      );

      expect(getByText('Child Component')).toBeDefined();
    });

    it('should render multiple children', () => {
      const { getByText } = render(
        <AppProviders>
          <Text>First Child</Text>
          <Text>Second Child</Text>
          <Text>Third Child</Text>
        </AppProviders>,
      );

      expect(getByText('First Child')).toBeDefined();
      expect(getByText('Second Child')).toBeDefined();
      expect(getByText('Third Child')).toBeDefined();
    });
  });

  describe('Provider Hierarchy', () => {
    it('should render GestureHandlerRootView as outermost wrapper', () => {
      const { UNSAFE_root } = render(
        <AppProviders>
          <Text>Content</Text>
        </AppProviders>,
      );

      const gestureHandler = UNSAFE_root.findByType('GestureHandlerRootView' as any);
      expect(gestureHandler).toBeDefined();
    });

    it('should apply flex: 1 style to GestureHandlerRootView', () => {
      const { UNSAFE_root } = render(
        <AppProviders>
          <Text>Content</Text>
        </AppProviders>,
      );

      const gestureHandler = UNSAFE_root.findByType('GestureHandlerRootView' as any);
      expect(gestureHandler.props.style).toEqual({ flex: 1 });
    });

    it('should render SafeAreaProvider inside GestureHandlerRootView', () => {
      const { UNSAFE_root } = render(
        <AppProviders>
          <Text>Content</Text>
        </AppProviders>,
      );

      const gestureHandler = UNSAFE_root.findByType('GestureHandlerRootView' as any);
      const safeAreaProvider = gestureHandler.findByType('SafeAreaProvider' as any);
      expect(safeAreaProvider).toBeDefined();
    });

    it('should render TamaguiProvider inside SafeAreaProvider', () => {
      const { UNSAFE_root } = render(
        <AppProviders>
          <Text>Content</Text>
        </AppProviders>,
      );

      // TamaguiProvider renders as View in our mock
      const safeAreaProvider = UNSAFE_root.findByType('SafeAreaProvider' as any);
      const tamaguiProvider = safeAreaProvider.findByType(View);
      expect(tamaguiProvider).toBeDefined();
    });

    it('should render StatusBar inside TamaguiProvider', () => {
      const { UNSAFE_root } = render(
        <AppProviders>
          <Text>Content</Text>
        </AppProviders>,
      );

      const statusBar = UNSAFE_root.findByType('StatusBar' as any);
      expect(statusBar).toBeDefined();
    });

    it('should pass style="auto" to StatusBar', () => {
      const { UNSAFE_root } = render(
        <AppProviders>
          <Text>Content</Text>
        </AppProviders>,
      );

      const statusBar = UNSAFE_root.findByType('StatusBar' as any);
      expect(statusBar.props.style).toBe('auto');
    });
  });

  describe('Complete Provider Stack', () => {
    it('should have correct provider nesting order', () => {
      const { UNSAFE_root } = render(
        <AppProviders>
          <View testID="child-content">
            <Text>Test</Text>
          </View>
        </AppProviders>,
      );

      // Verify the nesting: GestureHandler > SafeArea > Tamagui > Children + StatusBar
      const gestureHandler = UNSAFE_root.findByType('GestureHandlerRootView' as any);
      const safeAreaProvider = gestureHandler.findByType('SafeAreaProvider' as any);
      const tamaguiProvider = safeAreaProvider.findByType(View);

      // Children should be inside TamaguiProvider
      const childContent = tamaguiProvider.findByProps({ testID: 'child-content' });
      expect(childContent).toBeDefined();

      // StatusBar should also be inside TamaguiProvider
      const statusBar = tamaguiProvider.findByType('StatusBar' as any);
      expect(statusBar).toBeDefined();
    });

    it('should render all providers when given complex children', () => {
      const ComplexChild = () => (
        <View>
          <Text>Header</Text>
          <View>
            <Text>Body</Text>
          </View>
          <Text>Footer</Text>
        </View>
      );

      const { getByText, UNSAFE_root } = render(
        <AppProviders>
          <ComplexChild />
        </AppProviders>,
      );

      // Verify all providers are present
      expect(UNSAFE_root.findByType('GestureHandlerRootView' as any)).toBeDefined();
      expect(UNSAFE_root.findByType('SafeAreaProvider' as any)).toBeDefined();
      expect(UNSAFE_root.findByType('StatusBar' as any)).toBeDefined();

      // Verify children are rendered
      expect(getByText('Header')).toBeDefined();
      expect(getByText('Body')).toBeDefined();
      expect(getByText('Footer')).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should render with no children', () => {
      const { UNSAFE_root } = render(<AppProviders />);

      expect(UNSAFE_root.findByType('GestureHandlerRootView' as any)).toBeDefined();
      expect(UNSAFE_root.findByType('SafeAreaProvider' as any)).toBeDefined();
      expect(UNSAFE_root.findByType('StatusBar' as any)).toBeDefined();
    });

    it('should render with null children', () => {
      const { UNSAFE_root } = render(<AppProviders>{null}</AppProviders>);

      expect(UNSAFE_root).toBeDefined();
    });

    it('should render with undefined children', () => {
      const { UNSAFE_root } = render(<AppProviders>{undefined}</AppProviders>);

      expect(UNSAFE_root).toBeDefined();
    });

    it('should render with fragment children', () => {
      const { getByText } = render(
        <AppProviders>
          <>
            <Text>Fragment Child 1</Text>
            <Text>Fragment Child 2</Text>
          </>
        </AppProviders>,
      );

      expect(getByText('Fragment Child 1')).toBeDefined();
      expect(getByText('Fragment Child 2')).toBeDefined();
    });
  });

  describe('Integration', () => {
    it('should work with nested Views and Text', () => {
      const { getByText, getByTestId } = render(
        <AppProviders>
          <View testID="outer-view">
            <View testID="inner-view">
              <Text>Nested Text</Text>
            </View>
          </View>
        </AppProviders>,
      );

      expect(getByTestId('outer-view')).toBeDefined();
      expect(getByTestId('inner-view')).toBeDefined();
      expect(getByText('Nested Text')).toBeDefined();
    });

    it('should maintain provider context for deeply nested components', () => {
      const DeeplyNestedComponent = () => (
        <View>
          <View>
            <View>
              <Text>Deep Content</Text>
            </View>
          </View>
        </View>
      );

      const { getByText } = render(
        <AppProviders>
          <DeeplyNestedComponent />
        </AppProviders>,
      );

      expect(getByText('Deep Content')).toBeDefined();
    });
  });
});
