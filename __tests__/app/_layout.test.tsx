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
jest.mock('tamagui', () => ({
  TamaguiProvider: ({ children }: any) => children,
  Theme: ({ children }: any) => children,
  YStack: ({ children }: any) => <>{children}</>,
  createTamagui: jest.fn(() => ({})),
  createTokens: jest.fn((tokens) => tokens),
  createFont: jest.fn((font) => font),
}));

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

  return { Stack: MockStack };
});

import { render } from '@testing-library/react-native';
import React from 'react';
import RootLayout from '../../app/_layout';

jest.mock('@/db/sqlite/cleanup', () => ({
  cleanupSoftDeletedRecords: jest.fn().mockResolvedValue(0),
}));

jest.mock('@/db/sqlite/archive', () => ({
  archiveOldEntries: jest.fn().mockResolvedValue(0),
}));

jest.mock('@/db/sqlite/maintenance', () => ({
  optimizeDatabase: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/observability/AnalyticsProvider', () => ({
  AnalyticsProvider: ({ children }: any) => children,
}));

jest.mock('@/notifications', () => ({
  registerNotificationCategories: jest.fn().mockResolvedValue(undefined),
  configureNotificationHandler: jest.fn().mockResolvedValue(undefined),
  resetBadgeCount: jest.fn().mockResolvedValue(undefined),
  initializeInAppMessaging: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/notifications/ForegroundReminderToastHost', () => ({
  ForegroundReminderToastHost: () => null,
}));

jest.mock('@/state', () => ({
  getQueryClient: jest.fn(() => ({
    mount: jest.fn(),
    unmount: jest.fn(),
  })),
  getQueryClientPersistOptions: jest.fn(() => null),
}));

describe('RootLayout', () => {
  beforeEach(() => {
    recordedScreens.length = 0;
  });

  test('registers all screens', () => {
    render(<RootLayout />);

    expect(recordedScreens).toEqual(
      expect.arrayContaining(['index', '(auth)', '(tabs)', 'details']),
    );
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
    expect(recordedScreens).toEqual(
      expect.arrayContaining(['index', '(auth)', '(tabs)', 'details']),
    );
  });
});
