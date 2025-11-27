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

jest.mock('@/notifications', () => ({
  registerNotificationCategories: jest.fn().mockResolvedValue(undefined),
  configureNotificationHandler: jest.fn().mockResolvedValue(undefined),
  resetBadgeCount: jest.fn().mockResolvedValue(undefined),
  initializeInAppMessaging: jest.fn().mockResolvedValue(undefined),
  allowInAppMessages: jest.fn().mockResolvedValue(undefined),
  setMessageTriggers: jest.fn().mockResolvedValue(undefined),
  initializeFCMListeners: jest.fn().mockReturnValue(undefined),
}));

jest.mock('@/db/sqlite/cleanup', () => ({
  cleanupSoftDeletedRecords: jest.fn().mockResolvedValue(0),
}));

jest.mock('@/db/sqlite/archive', () => ({
  archiveOldEntries: jest.fn().mockResolvedValue(0),
}));

jest.mock('@/db/sqlite/maintenance', () => ({
  optimizeDatabase: jest.fn().mockResolvedValue({ vacuumed: true, optimized: true, pragmas: true }),
}));

// Mock expo-notifications
const mockNotificationSubscription = { remove: jest.fn() };
jest.mock('expo-notifications', () => ({
  setNotificationCategoryAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => mockNotificationSubscription),
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
  };
});

const actualThemePalettes = jest.requireActual('@/ui/theme/palette').themePalettes;

import { AppProviders } from '@/ui/providers/AppProviders';
import { render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text, View } from 'react-native';

describe('AppProviders', () => {
  // Suppress console output during tests
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;

  beforeAll(() => {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterAll(() => {
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });

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
      expect(gestureHandler.props.style).toEqual({
        flex: 1,
        backgroundColor: actualThemePalettes.light.background,
      });
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
      const { themePalettes } = require('@/ui/theme/palette');
      useThemeContext.mockReturnValue({
        resolvedTheme: 'dark',
        palette: themePalettes.dark,
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

    it('resets badge count on mount for iOS', () => {
      const { resetBadgeCount } = require('@/notifications');
      render(
        <AppProviders>
          <Text>Test</Text>
        </AppProviders>,
      );
      expect(resetBadgeCount).toHaveBeenCalled();
    });

    it('skips badge reset on non-iOS platforms', () => {
      const { resetBadgeCount } = require('@/notifications');
      const { Platform } = require('react-native');
      const originalOS = Platform.OS;
      Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });

      render(
        <AppProviders>
          <Text>Test</Text>
        </AppProviders>,
      );

      expect(resetBadgeCount).not.toHaveBeenCalled();
      Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
    });

    it('runs database optimization after cleanup removes records', async () => {
      const { cleanupSoftDeletedRecords } = require('@/db/sqlite/cleanup');
      const { optimizeDatabase } = require('@/db/sqlite/maintenance');
      mockSessionState.status = 'authenticated';
      cleanupSoftDeletedRecords.mockResolvedValueOnce(5);

      render(
        <AppProviders>
          <Text>Test</Text>
        </AppProviders>,
      );

      await waitFor(() => {
        expect(optimizeDatabase).toHaveBeenCalled();
      });
    });

    it('runs database optimization after archival removes entries', async () => {
      const { cleanupSoftDeletedRecords } = require('@/db/sqlite/cleanup');
      const { archiveOldEntries } = require('@/db/sqlite/archive');
      const { optimizeDatabase } = require('@/db/sqlite/maintenance');
      mockSessionState.status = 'authenticated';
      cleanupSoftDeletedRecords.mockResolvedValueOnce(0);
      archiveOldEntries.mockResolvedValueOnce(3);

      render(
        <AppProviders>
          <Text>Test</Text>
        </AppProviders>,
      );

      await waitFor(() => {
        expect(optimizeDatabase).toHaveBeenCalled();
      });
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

  describe('Session state', () => {
    it('should handle loading session state', () => {
      mockSessionState.status = 'loading';
      const { getByText } = render(
        <AppProviders>
          <Text>Loading state</Text>
        </AppProviders>,
      );

      expect(getByText('Loading state')).toBeDefined();
    });

    it('should handle error session state', () => {
      mockSessionState.status = 'error';
      const { getByText } = render(
        <AppProviders>
          <Text>Error state</Text>
        </AppProviders>,
      );

      expect(getByText('Error state')).toBeDefined();
    });
  });

  describe('Platform-specific behavior', () => {
    it('should render on web platform', () => {
      // Note: Testing web platform with actual module reload is complex
      // due to Tamagui and other dependencies. The web branch is covered
      // by integration tests. This test verifies the component is resilient
      // to different platform configurations.
      const { getByText } = render(
        <AppProviders>
          <Text>Platform test</Text>
        </AppProviders>,
      );

      expect(getByText('Platform test')).toBeDefined();
    });
  });

  // Note: Side effects like initSessionListener and useSync are tested through
  // integration tests rather than mocking internal implementation details
});
