const recordedScreens: string[] = [];

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('@/auth/session', () => ({
  initSessionListener: jest.fn().mockResolvedValue(undefined),
  useSessionStore: jest.fn(() => ({
    status: 'unauthenticated',
    session: null,
  })),
}));

jest.mock('@/sync', () => ({
  useSync: jest.fn().mockReturnValue({
    status: 'idle',
    queueSize: 0,
    lastSyncedAt: null,
    lastError: null,
    triggerSync: jest.fn(),
  }),
  pushOutbox: jest.fn(),
  pullUpdates: jest.fn(),
}));

jest.mock('@/notifications/useNotificationSettings', () => ({
  useNotificationSettings: jest.fn().mockReturnValue({
    permissionStatus: 'prompt',
    tryPromptForPush: jest.fn(),
    softPrompt: {
      open: false,
      title: 'Enable notifications?',
      message: 'Get reminders for your habits',
      allowLabel: 'Allow',
      notNowLabel: 'Not now',
      onAllow: jest.fn(),
      onNotNow: jest.fn(),
      setOpen: jest.fn(),
    },
  }),
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
        accent: themePalettes.light.accent,
        accentMuted: themePalettes.light.accentMuted,
      },
    })),
    ThemeProvider: ({ children }: any) => children,
  };
});

// Mock Tamagui
jest.mock('tamagui', () => {
  const React = jest.requireActual('react');
  const Dialog: any = ({ children }: any) => <>{children}</>;
  Dialog.displayName = 'Dialog';
  Dialog.Portal = ({ children }: any) => <>{children}</>;
  Dialog.Portal.displayName = 'Dialog.Portal';
  Dialog.Overlay = () => null;
  Dialog.Overlay.displayName = 'Dialog.Overlay';
  Dialog.Content = ({ children }: any) => <>{children}</>;
  Dialog.Content.displayName = 'Dialog.Content';
  Dialog.Title = ({ children, asChild }: any) => (asChild ? children : <>{children}</>);
  Dialog.Title.displayName = 'Dialog.Title';
  Dialog.Description = ({ children, asChild }: any) => (asChild ? children : <>{children}</>);
  Dialog.Description.displayName = 'Dialog.Description';
  Dialog.Close = ({ children }: any) => <>{children}</>;
  Dialog.Close.displayName = 'Dialog.Close';

  return {
    TamaguiProvider: ({ children }: any) => children,
    Theme: ({ children }: any) => children,
    YStack: ({ children, ...props }: any) => React.createElement('YStack', props, children),
    XStack: ({ children, ...props }: any) => React.createElement('XStack', props, children),
    Paragraph: ({ children, ...props }: any) => React.createElement('Paragraph', props, children),
    Dialog,
    Button: ({ children, ...props }: any) => React.createElement('Button', props, children),
    createTamagui: jest.fn(() => ({})),
    createTokens: jest.fn((tokens) => tokens),
    createFont: jest.fn((font) => font),
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

// Mock Tamagui fonts
jest.mock('@tamagui/font-inter', () => ({
  createInterFont: jest.fn(() => ({ family: 'Inter' })),
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  ThemeProvider: ({ children }: any) => children,
  DefaultTheme: {},
  DarkTheme: {},
}));

jest.mock('expo-router', () => {
  const MockStack: any = ({ children }: React.PropsWithChildren<Record<string, unknown>>) => {
    return <>{children}</>;
  };

  MockStack.Screen = ({ name, children }: { name: string; children?: React.ReactNode }) => {
    recordedScreens.push(name);
    return <>{children}</>;
  };
  MockStack.Screen.displayName = 'MockStack.Screen';

  return {
    Stack: MockStack,
    useRouter: jest.fn(() => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
    })),
  };
});

jest.mock('@/db/sqlite/cleanup', () => ({
  cleanupSoftDeletedRecords: jest.fn().mockResolvedValue(0),
}));

jest.mock('@/db/sqlite/archive', () => ({
  archiveOldEntries: jest.fn().mockResolvedValue(0),
}));

jest.mock('@/db/sqlite/maintenance', () => ({
  optimizeDatabase: jest.fn().mockResolvedValue(undefined),
}));

import { render } from '@testing-library/react-native';
import React from 'react';
import RootLayout from '../../app/_layout';

jest.mock('@/observability/AnalyticsProvider', () => ({
  AnalyticsProvider: ({ children }: any) => children,
  useAnalytics: jest.fn(() => ({
    trackEvent: jest.fn(),
    trackError: jest.fn(),
    trackPerformance: jest.fn(),
  })),
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

beforeAll(() => {
  jest.spyOn(console, 'info').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterAll(() => {
  jest.restoreAllMocks();
});

jest.mock('@/notifications/ForegroundReminderAnalyticsHost', () => ({
  ForegroundReminderAnalyticsHost: () => null,
}));

jest.mock('@/state', () => ({
  getQueryClient: jest.fn(() => ({
    mount: jest.fn(),
    unmount: jest.fn(),
  })),
  getQueryClientPersistOptions: jest.fn(() => null),
}));

describe('RootLayout', () => {
  // Suppress console output during tests
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;

  beforeAll(() => {
    // Suppress console.log during tests for cleaner output
    console.log = jest.fn();

    // Suppress React act() warnings - these are expected for async state updates
    console.error = jest.fn((message) => {
      const rendered = message?.toString() ?? '';
      if (
        rendered.includes('not wrapped in act') ||
        rendered.includes('[AppProviders] Failed to read last notification response')
      ) {
        return;
      }
      originalConsoleError(message);
    });
  });

  afterAll(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  beforeEach(() => {
    recordedScreens.length = 0;
  });

  test('registers all screens', () => {
    render(<RootLayout />);

    expect(recordedScreens).toEqual(expect.arrayContaining(['index', '(auth)', '(tabs)']));
  });

  test('renders with dark theme when resolvedTheme is dark', () => {
    // Mock dark theme
    const { useThemeContext } = require('@/ui/theme/ThemeProvider');
    const { themePalettes } = require('@/ui/theme/palette');
    useThemeContext.mockReturnValueOnce({
      resolvedTheme: 'dark',
      palette: {
        background: themePalettes.dark.background,
        text: themePalettes.dark.text,
        mutedText: themePalettes.dark.mutedText,
        accent: themePalettes.dark.accent,
        accentMuted: themePalettes.dark.accentMuted,
      },
    });

    render(<RootLayout />);

    // Verify it renders without errors
    expect(recordedScreens).toEqual(expect.arrayContaining(['index', '(auth)', '(tabs)']));
  });
});
