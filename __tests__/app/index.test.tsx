const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  Stack: {
    Screen: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  },
  useFocusEffect: (callback: () => void) => {
    const React = jest.requireActual('react');
    React.useEffect(() => callback(), [callback]);
  },
  useRouter: () => ({
    push: mockPush,
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

jest.mock('@/auth/nameStorage', () => ({
  getLocalName: jest.fn(),
}));

import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TamaguiProvider } from 'tamagui';
import HomeScreen from '../../app/(tabs)/index';
import { tamaguiConfig } from '../../tamagui.config';
import { getLocalName } from '@/auth/nameStorage';

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

    expect(await screen.findByTestId('welcome-title')).toBeTruthy();
    expect(await screen.findByTestId('get-started-button')).toBeTruthy();
  });

  test('navigates to settings when Get Started is pressed', async () => {
    const { getByTestId } = render(
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

    const button = getByTestId('get-started-button');
    fireEvent.press(button);

    expect(mockPush).toHaveBeenCalledWith('/(tabs)/settings');
  });

  test('shows the first name when stored locally', async () => {
    (getLocalName as jest.Mock).mockReturnValue('Ada Lovelace');

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

    expect(await screen.findByTestId('welcome-title')).toHaveTextContent('home.title, Ada');
  });
});
