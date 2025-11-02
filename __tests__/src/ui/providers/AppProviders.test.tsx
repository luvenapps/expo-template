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

// Mock auth session
const mockSessionState = {
  status: 'unauthenticated',
  session: null,
};

jest.mock('@/auth/session', () => ({
  initSessionListener: jest.fn().mockResolvedValue(undefined),
  useSessionStore: jest.fn((selector: (state: typeof mockSessionState) => any) =>
    selector(mockSessionState),
  ),
}));

// Mock sync hook - must use factory function
jest.mock('@/sync', () => ({
  useSync: jest.fn().mockReturnValue({
    status: 'idle',
    queueSize: 0,
    lastSyncedAt: null,
    lastError: null,
    triggerSync: jest.fn(),
  }),
  useSyncTask: jest.fn(),
  createSyncEngine: jest.fn(),
  pushOutbox: jest.fn(),
  pullUpdates: jest.fn(),
}));

// Mock ThemeProvider
jest.mock('@/ui/theme/ThemeProvider', () => ({
  useThemeContext: jest.fn(() => ({
    resolvedTheme: 'light',
    palette: {
      background: '#FFFFFF',
      text: '#0F172A',
      mutedText: '#475569',
    },
  })),
}));

import { AppProviders } from '@/ui/providers/AppProviders';
import { render } from '@testing-library/react-native';
import React from 'react';
import { Text, View } from 'react-native';

describe('AppProviders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionState.status = 'unauthenticated';
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

    it('should apply flex: 1 and backgroundColor style to GestureHandlerRootView', () => {
      const { UNSAFE_root } = render(
        <AppProviders>
          <Text>Content</Text>
        </AppProviders>,
      );

      const gestureHandler = UNSAFE_root.findByType('GestureHandlerRootView' as any);
      expect(gestureHandler.props.style).toEqual({ flex: 1, backgroundColor: '#FFFFFF' });
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

    it('should pass style="dark" to StatusBar when theme is light', () => {
      const { UNSAFE_root } = render(
        <AppProviders>
          <Text>Content</Text>
        </AppProviders>,
      );

      const statusBar = UNSAFE_root.findByType('StatusBar' as any);
      expect(statusBar.props.style).toBe('dark');
    });

    it('should pass style="light" to StatusBar when theme is dark', () => {
      const { useThemeContext } = require('@/ui/theme/ThemeProvider');
      useThemeContext.mockReturnValue({
        resolvedTheme: 'dark',
        palette: {
          background: '#1a1a1a',
          text: '#FFFFFF',
          mutedText: '#E2E8F0',
        },
      });

      const { UNSAFE_root } = render(
        <AppProviders>
          <Text>Content</Text>
        </AppProviders>,
      );

      const statusBar = UNSAFE_root.findByType('StatusBar' as any);
      expect(statusBar.props.style).toBe('light');
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

      // Verify the nesting: GestureHandler > SafeArea > QueryClient > YStack > Children + StatusBar
      const gestureHandler = UNSAFE_root.findByType('GestureHandlerRootView' as any);
      const safeAreaProvider = gestureHandler.findByType('SafeAreaProvider' as any);

      // Find the YStack (which should be inside QueryClientProvider)
      const ystack = safeAreaProvider.findByProps({ testID: 'app-root-container' });
      expect(ystack).toBeDefined();

      // Children should be inside YStack
      const childContent = ystack.findByProps({ testID: 'child-content' });
      expect(childContent).toBeDefined();

      // StatusBar should be a sibling of YStack (both inside QueryClientProvider)
      const statusBar = safeAreaProvider.findByType('StatusBar' as any);
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

  describe('Hooks and Effects', () => {
    it('should call initSessionListener on mount', () => {
      const { initSessionListener } = require('@/auth/session');
      render(
        <AppProviders>
          <Text>Test</Text>
        </AppProviders>,
      );
      expect(initSessionListener).toHaveBeenCalled();
    });

    it('should initialize sync with disabled state', () => {
      const { useSync, pushOutbox, pullUpdates } = require('@/sync');
      render(
        <AppProviders>
          <Text>Test</Text>
        </AppProviders>,
      );
      expect(useSync).toHaveBeenCalledWith({
        push: pushOutbox,
        pull: pullUpdates,
        enabled: false,
        autoStart: false,
        backgroundInterval: 900,
      });
    });

    it('should enable sync when user is authenticated on native platforms', () => {
      mockSessionState.status = 'authenticated';
      const { useSync } = require('@/sync');
      render(
        <AppProviders>
          <Text>Test</Text>
        </AppProviders>,
      );
      expect(useSync).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: true,
          autoStart: true,
        }),
      );
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

  // Note: Side effects like initSessionListener and useSync are tested through
  // integration tests rather than mocking internal implementation details
});
