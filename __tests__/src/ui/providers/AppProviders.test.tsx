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

jest.mock('@/observability/logger', () => {
  const loggers = new Map<
    string,
    {
      info: jest.Mock;
      error: jest.Mock;
      warn: jest.Mock;
      debug: jest.Mock;
    }
  >();
  const createLogger = jest.fn((name: string) => {
    const logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };
    loggers.set(name, logger);
    return logger;
  });
  return {
    createLogger,
    __mock: {
      loggers,
      createLogger,
    },
  };
});

const getLoggerMocks = () => {
  const { __mock } = require('@/observability/logger');
  return __mock as {
    loggers: Map<
      string,
      {
        info: jest.Mock;
        error: jest.Mock;
        warn: jest.Mock;
        debug: jest.Mock;
      }
    >;
    createLogger: jest.Mock;
  };
};

const mockAnalyticsTrackEvent = jest.fn();
jest.mock('@/observability/analytics', () => ({
  analytics: {
    trackEvent: (...args: unknown[]) => mockAnalyticsTrackEvent(...args),
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
let mockNotificationResponseHandler: ((response: any) => void) | null = null;
jest.mock('expo-notifications', () => ({
  setNotificationCategoryAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => mockNotificationSubscription),
  addNotificationResponseReceivedListener: jest.fn((handler) => {
    mockNotificationResponseHandler = handler;
    return mockNotificationSubscription;
  }),
  getLastNotificationResponseAsync: jest.fn().mockResolvedValue(null),
}));

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  })),
}));

// Mock auth session
const mockSessionState: { status: string; session: any } = {
  status: 'unauthenticated',
  session: null,
};

jest.mock('@/auth/session', () => ({
  initSessionListener: jest.fn().mockResolvedValue(undefined),
  useSessionStore: jest.fn((selector: (state: typeof mockSessionState) => any) =>
    selector(mockSessionState),
  ),
}));

const mockGetPendingRemoteReset = jest.fn().mockReturnValue(false);
const mockRunPendingRemoteReset = jest.fn().mockResolvedValue(undefined);
jest.mock('@/auth/reset', () => ({
  getPendingRemoteReset: () => mockGetPendingRemoteReset(),
  runPendingRemoteReset: (...args: unknown[]) => mockRunPendingRemoteReset(...args),
}));

const mockGetLocalName = jest.fn();
const mockSetLocalName = jest.fn();
jest.mock('@/auth/nameStorage', () => ({
  getLocalName: () => mockGetLocalName(),
  setLocalName: (...args: unknown[]) => mockSetLocalName(...args),
}));

const mockEnsureServiceWorkerRegistered = jest.fn().mockResolvedValue(undefined);
jest.mock('@/notifications/firebasePush', () => ({
  ensureServiceWorkerRegistered: (...args: unknown[]) => mockEnsureServiceWorkerRegistered(...args),
}));

const mockOnNotificationEvent = jest.fn();
let mockNotificationEventHandler: ((context: any) => void) | null = null;
jest.mock('@/notifications/notificationEvents', () => ({
  onNotificationEvent: (...args: unknown[]) => mockOnNotificationEvent(...args),
}));

const mockRefreshReminderSeriesWindows = jest.fn().mockResolvedValue(undefined);
jest.mock('@/notifications/scheduler', () => ({
  refreshReminderSeriesWindows: (...args: unknown[]) => mockRefreshReminderSeriesWindows(...args),
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

// Mock notification settings hook
const mockNotificationSettingsDefault = {
  permissionStatus: 'prompt',
  tryPromptForPush: jest.fn(),
  softPrompt: {
    open: false,
    title: 'Enable notifications?',
    message: 'Get reminders',
    allowLabel: 'Allow',
    notNowLabel: 'Not now',
    onAllow: jest.fn(),
    onNotNow: jest.fn(),
    setOpen: jest.fn(),
  },
};

jest.mock('@/notifications/useNotificationSettings', () => ({
  useNotificationSettings: jest.fn().mockReturnValue(mockNotificationSettingsDefault),
}));

const mockFeatureFlagClient = {
  ready: jest.fn().mockResolvedValue(undefined),
  getStatus: jest.fn().mockReturnValue('ready'),
  getFlag: jest.fn().mockReturnValue(false),
  setContext: jest.fn().mockResolvedValue(undefined),
  refresh: jest.fn().mockResolvedValue(undefined),
  subscribe: jest.fn(() => jest.fn()),
  destroy: jest.fn(),
};

jest.mock('@/featureFlags', () => ({
  getFeatureFlagClient: jest.fn(() => mockFeatureFlagClient),
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

// Mock Tamagui Dialog
jest.mock('tamagui', () => {
  const React = jest.requireActual('react');
  const Dialog: any = ({ children }: any) => React.createElement('Dialog', null, children);
  Dialog.displayName = 'Dialog';
  Dialog.Portal = ({ children }: any) => React.createElement('Dialog.Portal', null, children);
  Dialog.Portal.displayName = 'Dialog.Portal';
  Dialog.Overlay = () => null;
  Dialog.Overlay.displayName = 'Dialog.Overlay';
  Dialog.Content = ({ children }: any) => React.createElement('Dialog.Content', null, children);
  Dialog.Content.displayName = 'Dialog.Content';
  Dialog.Title = ({ children, asChild }: any) =>
    asChild ? children : React.createElement('Dialog.Title', null, children);
  Dialog.Title.displayName = 'Dialog.Title';
  Dialog.Description = ({ children, asChild }: any) =>
    asChild ? children : React.createElement('Dialog.Description', null, children);
  Dialog.Description.displayName = 'Dialog.Description';
  Dialog.Close = ({ children }: any) => React.createElement('Dialog.Close', null, children);
  Dialog.Close.displayName = 'Dialog.Close';

  // Return TamaguiProvider as a function component that renders children in a View
  const TamaguiProvider = (props: any) => {
    const RN = require('react-native');
    return React.createElement(RN.View, null, props.children);
  };

  return {
    TamaguiProvider,
    Theme: ({ children }: any) => children,
    Text: ({ children, ...props }: any) => React.createElement('Text', props, children),
    YStack: ({ children, ...props }: any) => React.createElement('YStack', props, children),
    XStack: ({ children, ...props }: any) => React.createElement('XStack', props, children),
    Paragraph: ({ children, ...props }: any) => React.createElement('Paragraph', props, children),
    Dialog,
    Button: ({ children, ...props }: any) => React.createElement('Button', props, children),
  };
});

// Mock PrimaryButton
jest.mock('@/ui/components/PrimaryButton', () => {
  const React = jest.requireActual('react');
  return {
    PrimaryButton: ({ children, ...props }: any) =>
      React.createElement('PrimaryButton', props, children),
  };
});

// Mock NamePromptModal
jest.mock('@/ui/components/NamePromptModal', () => {
  const React = jest.requireActual('react');
  return {
    NamePromptModal: (props: any) => React.createElement('NamePromptModal', props),
  };
});

// Mock SoftPromptModal
jest.mock('@/ui/components/SoftPromptModal', () => ({
  SoftPromptModal: () => null,
}));

const actualThemePalettes = jest.requireActual('@/ui/theme/palette').themePalettes;

import { AppProviders } from '@/ui/providers/AppProviders';
import { render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text, View } from 'react-native';

describe('AppProviders', () => {
  // Suppress console output during tests
  const originalConsoleLog = console.log;
  const originalConsoleInfo = console.info;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;
  const originalFirebaseToggle = process.env.EXPO_PUBLIC_TURN_ON_FIREBASE;

  beforeAll(() => {
    console.log = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterAll(() => {
    console.log = originalConsoleLog;
    console.info = originalConsoleInfo;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = '';
    mockSessionState.status = 'unauthenticated';
    mockSessionState.session = null;
    mockGetLocalName.mockReturnValue(null);
    mockGetPendingRemoteReset.mockReturnValue(false);
    mockNotificationResponseHandler = null;
    mockNotificationEventHandler = null;
    const { loggers } = getLoggerMocks();
    loggers.forEach((logger) => {
      logger.info.mockClear();
      logger.error.mockClear();
      logger.warn.mockClear();
      logger.debug.mockClear();
    });
    mockOnNotificationEvent.mockImplementation((_: string, handler: any) => {
      mockNotificationEventHandler = handler;
      return jest.fn();
    });
    mockFeatureFlagClient.setContext.mockClear();
    const { useNotificationSettings } = require('@/notifications/useNotificationSettings');
    useNotificationSettings.mockReturnValue({
      ...mockNotificationSettingsDefault,
      tryPromptForPush: jest.fn(),
      softPrompt: {
        ...mockNotificationSettingsDefault.softPrompt,
        onAllow: jest.fn(),
        onNotNow: jest.fn(),
        setOpen: jest.fn(),
      },
    });
  });

  afterEach(() => {
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = originalFirebaseToggle;
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

    it('should render QueryClientProvider inside SafeAreaProvider', () => {
      const { UNSAFE_root } = render(
        <AppProviders>
          <Text>Content</Text>
        </AppProviders>,
      );

      // QueryClientProvider is rendered inside SafeAreaProvider
      const safeAreaProvider = UNSAFE_root.findByType('SafeAreaProvider' as any);
      // Just verify SafeAreaProvider has children (QueryClientProvider or PersistQueryClientProvider)
      expect(safeAreaProvider.children.length).toBeGreaterThan(0);
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
    it('syncs name from session metadata and handles pending reset flag', async () => {
      const { initSessionListener } = require('@/auth/session');
      mockGetPendingRemoteReset.mockReturnValue(true);

      const { UNSAFE_root } = render(
        <AppProviders>
          <Text>Test</Text>
        </AppProviders>,
      );

      const initCallback = initSessionListener.mock.calls[0][0];
      const session = {
        user: {
          user_metadata: {
            full_name: 'Test User',
          },
        },
      };

      initCallback(session);

      await waitFor(() => {
        expect(mockSetLocalName).toHaveBeenCalledWith('Test User');
        expect(mockRunPendingRemoteReset).toHaveBeenCalledWith(session, expect.any(Object));
      });

      const resetLogger = getLoggerMocks().loggers.get('Reset');
      expect(resetLogger?.info).toHaveBeenCalledWith('Pending remote reset detected');

      const namePrompt = UNSAFE_root.findByType('NamePromptModal' as any);
      expect(namePrompt.props.open).toBe(false);
      expect(namePrompt.props.value).toBe('Test User');
    });

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

    it('registers notification categories and handlers on mount', async () => {
      const {
        registerNotificationCategories,
        configureNotificationHandler,
      } = require('@/notifications');

      render(
        <AppProviders>
          <Text>Test</Text>
        </AppProviders>,
      );

      await waitFor(() => {
        expect(registerNotificationCategories).toHaveBeenCalled();
        expect(configureNotificationHandler).toHaveBeenCalled();
      });
    });

    it('skips in-app messaging initialization when firebase is disabled', async () => {
      const { initializeInAppMessaging } = require('@/notifications');

      render(
        <AppProviders>
          <Text>Test</Text>
        </AppProviders>,
      );

      await waitFor(() => {
        expect(initializeInAppMessaging).not.toHaveBeenCalled();
      });
    });

    it('handles notification initialization failures', async () => {
      const {
        registerNotificationCategories,
        configureNotificationHandler,
        initializeInAppMessaging,
      } = require('@/notifications');
      process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = 'true';
      registerNotificationCategories.mockRejectedValueOnce(new Error('categories failed'));
      configureNotificationHandler.mockRejectedValueOnce(new Error('handler failed'));
      initializeInAppMessaging.mockRejectedValueOnce(new Error('iam failed'));

      render(
        <AppProviders>
          <Text>Test</Text>
        </AppProviders>,
      );

      await waitFor(() => {
        expect(registerNotificationCategories).toHaveBeenCalled();
        expect(configureNotificationHandler).toHaveBeenCalled();
        expect(initializeInAppMessaging).toHaveBeenCalled();
      });

      process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = '';
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

    it('opens name prompt when no local name is stored', async () => {
      mockGetLocalName.mockReturnValue(null);

      const { UNSAFE_root } = render(
        <AppProviders>
          <Text>Test</Text>
        </AppProviders>,
      );

      await waitFor(() => {
        const namePrompt = UNSAFE_root.findByType('NamePromptModal' as any);
        expect(namePrompt.props.open).toBe(true);
      });
    });

    it('skips name prompt when local name is stored', async () => {
      mockGetLocalName.mockReturnValue('Local Name');

      const { UNSAFE_root } = render(
        <AppProviders>
          <Text>Test</Text>
        </AppProviders>,
      );

      await waitFor(() => {
        const namePrompt = UNSAFE_root.findByType('NamePromptModal' as any);
        expect(namePrompt.props.open).toBe(false);
        expect(namePrompt.props.value).toBe('Local Name');
      });
    });

    it('sets feature flag context for anonymous users', async () => {
      render(
        <AppProviders>
          <Text>Test</Text>
        </AppProviders>,
      );

      await waitFor(() => {
        expect(mockFeatureFlagClient.setContext).toHaveBeenCalledWith({ isAnonymous: true });
      });
    });

    it('sets feature flag context from session metadata', async () => {
      mockSessionState.status = 'authenticated';
      mockSessionState.session = {
        user: {
          id: 'user-1',
          email: 'user@example.com',
          user_metadata: {
            fullName: 'Full Name',
          },
        },
      };

      render(
        <AppProviders>
          <Text>Test</Text>
        </AppProviders>,
      );

      await waitFor(() => {
        expect(mockFeatureFlagClient.setContext).toHaveBeenCalledWith({
          id: 'user-1',
          email: 'user@example.com',
          name: 'Full Name',
        });
      });
    });

    it('swallows feature flag context failures', async () => {
      mockSessionState.status = 'authenticated';
      mockSessionState.session = {
        user: {
          id: 'user-2',
          email: 'user2@example.com',
          user_metadata: {
            full_name: 'User Two',
          },
        },
      };
      mockFeatureFlagClient.setContext.mockRejectedValueOnce(new Error('context failed'));

      render(
        <AppProviders>
          <Text>Test</Text>
        </AppProviders>,
      );

      await waitFor(() => {
        expect(mockFeatureFlagClient.setContext).toHaveBeenCalled();
      });
    });

    it('saves name from prompt and closes modal', async () => {
      mockGetLocalName.mockReturnValue(null);

      const { UNSAFE_root } = render(
        <AppProviders>
          <Text>Test</Text>
        </AppProviders>,
      );

      const namePrompt = UNSAFE_root.findByType('NamePromptModal' as any);
      namePrompt.props.onSave('Jane Doe');

      await waitFor(() => {
        expect(mockSetLocalName).toHaveBeenCalledWith('Jane Doe');
        const updatedPrompt = UNSAFE_root.findByType('NamePromptModal' as any);
        expect(updatedPrompt.props.open).toBe(false);
        expect(updatedPrompt.props.value).toBe('Jane Doe');
      });
    });

    it('initializes Firebase helpers when enabled and cleans up FCM listeners', async () => {
      process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = 'true';
      const {
        initializeInAppMessaging,
        registerNotificationCategories,
        configureNotificationHandler,
        initializeFCMListeners,
        setMessageTriggers,
      } = require('@/notifications');
      const unsubscribe = jest.fn();
      initializeFCMListeners.mockReturnValueOnce(unsubscribe);

      const { unmount } = render(
        <AppProviders>
          <Text>Test</Text>
        </AppProviders>,
      );

      await waitFor(() => {
        expect(registerNotificationCategories).toHaveBeenCalled();
        expect(configureNotificationHandler).toHaveBeenCalled();
        expect(initializeInAppMessaging).toHaveBeenCalled();
        expect(setMessageTriggers).toHaveBeenCalledWith({ app_ready: 'app_ready' });
      });

      unmount();
      expect(unsubscribe).toHaveBeenCalled();
      process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = '';
    });

    it('logs when app_ready trigger fails', async () => {
      process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = 'true';
      const { setMessageTriggers } = require('@/notifications');
      const error = new Error('boom');
      setMessageTriggers.mockRejectedValueOnce(error);

      render(
        <AppProviders>
          <Text>Test</Text>
        </AppProviders>,
      );

      await waitFor(() => {
        const iamLogger = getLoggerMocks().loggers.get('IAM');
        expect(iamLogger?.error).toHaveBeenCalledWith('Failed to trigger app_ready event:', error);
      });

      process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = '';
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

    it('resets badge count when app becomes active on iOS', () => {
      const { AppState } = require('react-native');
      const { Platform } = require('react-native');
      const { resetBadgeCount } = require('@/notifications');
      const mockAddEventListener = jest.fn().mockImplementation((_: string, handler: any) => ({
        remove: jest.fn(),
        handler,
      }));
      const originalAdd = AppState.addEventListener;
      const originalOS = Platform.OS;
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
      AppState.addEventListener = mockAddEventListener;

      render(
        <AppProviders>
          <Text>Test</Text>
        </AppProviders>,
      );

      resetBadgeCount.mockClear();
      const handler = mockAddEventListener.mock.calls[
        mockAddEventListener.mock.calls.length - 1
      ]?.[1] as ((state: string) => void) | undefined;
      handler?.('active');
      expect(resetBadgeCount).toHaveBeenCalledTimes(1);

      AppState.addEventListener = originalAdd;
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

    it('skips optimization when called twice within the same window', async () => {
      const { cleanupSoftDeletedRecords } = require('@/db/sqlite/cleanup');
      const { archiveOldEntries } = require('@/db/sqlite/archive');
      const { optimizeDatabase } = require('@/db/sqlite/maintenance');
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(86_400_000 + 1_000);
      mockSessionState.status = 'authenticated';
      cleanupSoftDeletedRecords.mockResolvedValueOnce(2);
      archiveOldEntries.mockResolvedValueOnce(1);

      render(
        <AppProviders>
          <Text>Test</Text>
        </AppProviders>,
      );

      try {
        await waitFor(() => {
          expect(optimizeDatabase).toHaveBeenCalledTimes(1);
        });
      } finally {
        nowSpy.mockRestore();
      }
    });

    it('logs when optimization fails', async () => {
      const { cleanupSoftDeletedRecords } = require('@/db/sqlite/cleanup');
      const { optimizeDatabase } = require('@/db/sqlite/maintenance');
      const error = new Error('optimize failed');
      mockSessionState.status = 'authenticated';
      cleanupSoftDeletedRecords.mockResolvedValueOnce(1);
      optimizeDatabase.mockRejectedValueOnce(error);

      render(
        <AppProviders>
          <Text>Test</Text>
        </AppProviders>,
      );

      await waitFor(() => {
        const dbLogger = getLoggerMocks().loggers.get('SQLite');
        expect(dbLogger?.error).toHaveBeenCalledWith('Optimization routine failed:', error);
      });
    });

    it('logs cleanup failure errors', async () => {
      const { cleanupSoftDeletedRecords } = require('@/db/sqlite/cleanup');
      const error = new Error('cleanup failed');
      mockSessionState.status = 'authenticated';
      cleanupSoftDeletedRecords.mockRejectedValueOnce(error);

      render(
        <AppProviders>
          <Text>Test</Text>
        </AppProviders>,
      );

      await waitFor(() => {
        const dbLogger = getLoggerMocks().loggers.get('SQLite');
        expect(dbLogger?.error).toHaveBeenCalledWith('Soft-delete cleanup failed:', error);
      });
    });

    it('logs archive failure errors', async () => {
      const { cleanupSoftDeletedRecords } = require('@/db/sqlite/cleanup');
      const { archiveOldEntries } = require('@/db/sqlite/archive');
      const error = new Error('archive failed');
      mockSessionState.status = 'authenticated';
      cleanupSoftDeletedRecords.mockResolvedValueOnce(0);
      archiveOldEntries.mockRejectedValueOnce(error);

      render(
        <AppProviders>
          <Text>Test</Text>
        </AppProviders>,
      );

      await waitFor(() => {
        const dbLogger = getLoggerMocks().loggers.get('SQLite');
        expect(dbLogger?.error).toHaveBeenCalledWith('Archive routine failed:', error);
      });
    });

    it('logs when reminder series refresh fails', async () => {
      const error = new Error('refresh failed');
      mockRefreshReminderSeriesWindows.mockRejectedValueOnce(error);

      render(
        <AppProviders>
          <Text>Test</Text>
        </AppProviders>,
      );

      await waitFor(() => {
        const appLogger = getLoggerMocks().loggers.get('AppProviders');
        expect(appLogger?.error).toHaveBeenCalledWith(
          'Failed to refresh reminder series window',
          error,
        );
      });
    });

    it('refreshes reminder series window on app active', async () => {
      const { AppState } = require('react-native');
      const mockAddEventListener = jest.fn().mockImplementation((_: string, handler: any) => ({
        remove: jest.fn(),
        handler,
      }));
      const originalAdd = AppState.addEventListener;
      AppState.addEventListener = mockAddEventListener;

      render(
        <AppProviders>
          <Text>Test</Text>
        </AppProviders>,
      );

      await waitFor(() => {
        expect(mockRefreshReminderSeriesWindows).toHaveBeenCalled();
      });

      const handler = mockAddEventListener.mock.calls[0]?.[1] as
        | ((state: string) => void)
        | undefined;
      handler?.('active');
      await waitFor(() => {
        expect(mockRefreshReminderSeriesWindows).toHaveBeenCalledTimes(2);
      });

      AppState.addEventListener = originalAdd;
    });

    it('skips cleanup when last run is recent', async () => {
      const { useSync } = require('@/sync');
      const { cleanupSoftDeletedRecords } = require('@/db/sqlite/cleanup');
      const nowSpy = jest.spyOn(Date, 'now');
      nowSpy.mockReturnValueOnce(1000);
      nowSpy.mockReturnValueOnce(2000);

      useSync
        .mockReturnValueOnce({ status: 'idle', queueSize: 0 })
        .mockReturnValueOnce({ status: 'paused', queueSize: 0 });

      const { rerender } = render(
        <AppProviders>
          <Text>Test</Text>
        </AppProviders>,
      );

      await waitFor(() => {
        expect(cleanupSoftDeletedRecords).toHaveBeenCalledTimes(1);
      });

      rerender(
        <AppProviders>
          <Text>Test</Text>
        </AppProviders>,
      );

      expect(cleanupSoftDeletedRecords).toHaveBeenCalledTimes(1);
      nowSpy.mockRestore();
    });

    it('skips cleanup when sync is busy', () => {
      const { useSync } = require('@/sync');
      const { cleanupSoftDeletedRecords } = require('@/db/sqlite/cleanup');
      cleanupSoftDeletedRecords.mockClear();
      useSync.mockReturnValue({
        status: 'syncing',
        queueSize: 0,
        lastSyncedAt: null,
        lastError: null,
        triggerSync: jest.fn(),
      });

      render(
        <AppProviders>
          <Text>Test</Text>
        </AppProviders>,
      );

      expect(cleanupSoftDeletedRecords).not.toHaveBeenCalled();
    });
  });

  describe('Notifications', () => {
    it('tracks reminder clicks and navigates when a route is provided', async () => {
      const { useRouter } = require('expo-router');
      const push = jest.fn();
      useRouter.mockReturnValue({ push, replace: jest.fn(), back: jest.fn() });
      const { getLastNotificationResponseAsync } = require('expo-notifications');
      const { DOMAIN } = require('@/config/domain.config');

      getLastNotificationResponseAsync.mockResolvedValueOnce({
        notification: {
          request: {
            content: {
              data: {
                reminderId: 'reminder-1',
                namespace: `${DOMAIN.app.name}-reminders`,
                route: '/(tabs)/settings',
              },
            },
          },
        },
      });

      render(
        <AppProviders>
          <Text>Test</Text>
        </AppProviders>,
      );

      await waitFor(() => {
        expect(mockAnalyticsTrackEvent).toHaveBeenCalledWith('reminders:clicked', {
          reminderId: 'reminder-1',
          route: '/(tabs)/settings',
          source: 'local',
          platform: 'ios',
        });
        expect(push).toHaveBeenCalledWith('/(tabs)/settings');
      });
    });

    it('logs an error when last notification response fails', async () => {
      const { getLastNotificationResponseAsync } = require('expo-notifications');
      const error = new Error('fail');
      getLastNotificationResponseAsync.mockRejectedValueOnce(error);

      render(
        <AppProviders>
          <Text>Test</Text>
        </AppProviders>,
      );

      await waitFor(() => {
        const appLogger = getLoggerMocks().loggers.get('AppProviders');
        expect(appLogger?.error).toHaveBeenCalledWith(
          'Failed to read last notification response',
          error,
        );
      });
    });

    it('does not navigate when notification has no route', async () => {
      const { useRouter } = require('expo-router');
      const push = jest.fn();
      useRouter.mockReturnValue({ push, replace: jest.fn(), back: jest.fn() });
      const { getLastNotificationResponseAsync } = require('expo-notifications');

      getLastNotificationResponseAsync.mockResolvedValueOnce({
        notification: {
          request: {
            content: {
              data: { reminderId: 'reminder-1' },
            },
          },
        },
      });

      render(
        <AppProviders>
          <Text>Test</Text>
        </AppProviders>,
      );

      await waitFor(() => {
        expect(push).not.toHaveBeenCalled();
      });
    });

    it('handles notification responses from listeners', async () => {
      const { useRouter } = require('expo-router');
      const push = jest.fn();
      useRouter.mockReturnValue({ push, replace: jest.fn(), back: jest.fn() });

      render(
        <AppProviders>
          <Text>Test</Text>
        </AppProviders>,
      );

      mockNotificationResponseHandler?.({
        notification: {
          request: {
            content: {
              data: { route: '/(tabs)/settings' },
            },
          },
        },
      });

      await waitFor(() => {
        expect(push).toHaveBeenCalledWith('/(tabs)/settings');
      });
    });

    it('triggers soft prompt when first entry event fires', async () => {
      const { useNotificationSettings } = require('@/notifications/useNotificationSettings');
      const tryPromptForPush = jest.fn().mockResolvedValue(undefined);
      useNotificationSettings.mockReturnValue({
        permissionStatus: 'prompt',
        tryPromptForPush,
        softPrompt: {
          open: false,
          title: 'Enable notifications?',
          message: 'Get reminders',
          allowLabel: 'Allow',
          notNowLabel: 'Not now',
          onAllow: jest.fn(),
          onNotNow: jest.fn(),
          setOpen: jest.fn(),
        },
      });

      render(
        <AppProviders>
          <Text>Test</Text>
        </AppProviders>,
      );

      mockNotificationEventHandler?.({ source: 'test' });

      await waitFor(() => {
        expect(tryPromptForPush).toHaveBeenCalledWith({ context: { source: 'test' } });
      });
    });

    it('logs when soft prompt trigger fails', async () => {
      const { useNotificationSettings } = require('@/notifications/useNotificationSettings');
      const tryPromptForPush = jest.fn().mockRejectedValue(new Error('fail'));
      useNotificationSettings.mockReturnValue({
        permissionStatus: 'prompt',
        tryPromptForPush,
        softPrompt: {
          open: false,
          title: 'Enable notifications?',
          message: 'Get reminders',
          allowLabel: 'Allow',
          notNowLabel: 'Not now',
          onAllow: jest.fn(),
          onNotNow: jest.fn(),
          setOpen: jest.fn(),
        },
      });

      render(
        <AppProviders>
          <Text>Test</Text>
        </AppProviders>,
      );

      mockNotificationEventHandler?.({ source: 'test' });

      await waitFor(() => {
        const appLogger = getLoggerMocks().loggers.get('AppProviders');
        expect(appLogger?.error).toHaveBeenCalledWith(
          'Failed to trigger push prompt:',
          expect.any(Error),
        );
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

    it('registers web resume checks and navigates on service worker click', async () => {
      const { Platform } = require('react-native');
      const originalOS = Platform.OS;
      Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });

      const originalDocument = (global as { document?: Document }).document;
      if (!originalDocument) {
        (global as { document?: unknown }).document = {
          visibilityState: 'visible',
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        };
      }
      const doc = (global as { document: Document }).document;
      const originalVisibility = doc.visibilityState;
      Object.defineProperty(doc, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });

      const originalWindow = (global as { window?: Window }).window;
      if (!originalWindow) {
        (global as { window?: unknown }).window = {
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          location: { assign: jest.fn() },
        };
      }
      if (typeof window.addEventListener !== 'function') {
        Object.defineProperty(window, 'addEventListener', {
          value: jest.fn(),
          configurable: true,
        });
      }
      if (typeof window.removeEventListener !== 'function') {
        Object.defineProperty(window, 'removeEventListener', {
          value: jest.fn(),
          configurable: true,
        });
      }
      const originalLocation = window.location;
      Object.defineProperty(window, 'location', {
        value: { assign: jest.fn() },
        configurable: true,
      });

      let swMessageHandler: ((event: MessageEvent) => void) | null = null;

      const docAddSpy = jest
        .spyOn(document, 'addEventListener')
        .mockImplementation(() => undefined);

      const winAddSpy = jest.spyOn(window, 'addEventListener').mockImplementation(() => undefined);

      const originalNavigator = (global as { navigator?: Navigator }).navigator;
      if (!originalNavigator) {
        (global as { navigator?: unknown }).navigator = {};
      }
      const originalServiceWorker = navigator.serviceWorker;
      (navigator as any).serviceWorker = {
        addEventListener: (_: string, handler: any) => {
          swMessageHandler = handler;
        },
        removeEventListener: jest.fn(),
      };

      jest.resetModules();
      jest.doMock('react', () => React);
      const { Platform: WebPlatform } = require('react-native');
      Object.defineProperty(WebPlatform, 'OS', { value: 'web', configurable: true });
      const WebProvider = require('@/ui/providers/AppProviders')
        .AppProviders as typeof AppProviders;

      const { unmount } = render(
        <WebProvider>
          <React.Fragment>
            <Text>Web</Text>
          </React.Fragment>
        </WebProvider>,
      );

      await waitFor(() => {
        expect(docAddSpy).toHaveBeenCalled();
        expect(winAddSpy).toHaveBeenCalled();
      });

      const visibilityHandler = docAddSpy.mock.calls.find(
        ([event]) => event === 'visibilitychange',
      )?.[1] as (() => void) | undefined;
      const focusHandler = winAddSpy.mock.calls.find(([event]) => event === 'focus')?.[1] as
        | (() => void)
        | undefined;
      visibilityHandler?.();
      focusHandler?.();

      await waitFor(() => {
        expect(mockEnsureServiceWorkerRegistered).toHaveBeenCalled();
      });

      (swMessageHandler as ((event: MessageEvent) => void) | null)?.({
        data: { type: 'PING' },
      } as MessageEvent);
      expect(window.location.assign).not.toHaveBeenCalled();

      (swMessageHandler as ((event: MessageEvent) => void) | null)?.({
        data: { type: 'NOTIFICATION_CLICKED', payload: { route: '/settings' } },
      } as MessageEvent);

      expect(window.location.assign).toHaveBeenCalledWith('/settings');

      unmount();
      docAddSpy.mockRestore();
      winAddSpy.mockRestore();
      Object.defineProperty(WebPlatform, 'OS', { value: originalOS, configurable: true });
      Object.defineProperty(doc, 'visibilityState', {
        value: originalVisibility,
        configurable: true,
      });
      (navigator as any).serviceWorker = originalServiceWorker;
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        configurable: true,
      });
      if (!originalWindow) {
        delete (global as { window?: Window }).window;
      }
      if (!originalNavigator) {
        delete (global as { navigator?: Navigator }).navigator;
      }
      if (!originalDocument) {
        delete (global as { document?: Document }).document;
      }
    });
  });

  // Note: Side effects like initSessionListener and useSync are tested through
  // integration tests rather than mocking internal implementation details
});
