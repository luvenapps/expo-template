jest.mock('expo-router', () => ({
  Stack: {
    Screen: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  },
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

import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TamaguiProvider } from 'tamagui';
import DetailsScreen from '../../app/details';
import { tamaguiConfig } from '../../tamagui.config';

describe('DetailsScreen', () => {
  test('shows the details heading', () => {
    render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <TamaguiProvider config={tamaguiConfig}>
          <DetailsScreen />
        </TamaguiProvider>
      </SafeAreaProvider>,
    );

    expect(screen.getByText('Details')).toBeTruthy();
    expect(screen.getByText(/detail view/i)).toBeTruthy();
  });
});
