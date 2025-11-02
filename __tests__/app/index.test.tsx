const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  Stack: {
    Screen: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  },
  useRouter: () => ({
    push: mockPush,
  }),
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

import { DOMAIN } from '@/config/domain.config';
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TamaguiProvider } from 'tamagui';
import HomeScreen from '../../app/(tabs)/index';
import { tamaguiConfig } from '../../tamagui.config';

describe('HomeScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  test('renders welcome copy and call to action', async () => {
    render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <TamaguiProvider config={tamaguiConfig}>
          <HomeScreen />
        </TamaguiProvider>
      </SafeAreaProvider>,
    );

    expect(await screen.findByText(`Welcome to ${DOMAIN.app.displayName}`)).toBeTruthy();
    expect(await screen.findByText('Get Started')).toBeTruthy();
  });

  test('navigates to settings when Get Started is pressed', async () => {
    const { getByText } = render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <TamaguiProvider config={tamaguiConfig}>
          <HomeScreen />
        </TamaguiProvider>
      </SafeAreaProvider>,
    );

    const button = getByText('Get Started');
    fireEvent.press(button);

    expect(mockPush).toHaveBeenCalledWith('/(tabs)/settings');
  });
});
