const recordedScreens: string[] = [];
let recordedProps: Record<string, unknown> | undefined;

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
jest.mock('@/ui/theme/ThemeProvider', () => ({
  useThemeContext: jest.fn(() => ({
    resolvedTheme: 'light',
    palette: {
      background: '#FFFFFF',
      text: '#0F172A',
      mutedText: '#475569',
      accent: '#2563EB',
      accentMuted: '#94A3B8',
    },
  })),
  ThemeProvider: ({ children }: any) => children,
}));

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
  const MockStack: any = ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) => {
    recordedProps = props;
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

describe('RootLayout', () => {
  beforeEach(() => {
    recordedScreens.length = 0;
    recordedProps = undefined;
  });

  test('applies shared header options and registers screens', () => {
    render(<RootLayout />);

    expect(recordedProps?.screenOptions).toMatchObject({
      headerBackButtonDisplayMode: 'minimal',
    });

    expect(recordedScreens).toEqual(
      expect.arrayContaining(['index', '(auth)', '(tabs)', 'details']),
    );
  });

  test('renders with dark theme when resolvedTheme is dark', () => {
    // Mock dark theme
    const { useThemeContext } = require('@/ui/theme/ThemeProvider');
    useThemeContext.mockReturnValueOnce({
      resolvedTheme: 'dark',
      palette: {
        background: '#0F172A',
        text: '#FFFFFF',
        mutedText: '#94A3B8',
        accent: '#60A5FA',
        accentMuted: '#94A3B8',
      },
    });

    render(<RootLayout />);

    // Verify it renders without errors
    expect(recordedScreens).toEqual(
      expect.arrayContaining(['index', '(auth)', '(tabs)', 'details']),
    );
  });
});
