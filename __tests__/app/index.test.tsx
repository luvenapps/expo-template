import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TamaguiProvider } from 'tamagui';
import TodayScreen from '../../app/(tabs)/index';
import { tamaguiConfig } from '../../tamagui.config';

jest.mock('expo-router', () => ({
  Stack: {
    Screen: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  },
}));

test('renders welcome copy and call to action', async () => {
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <TamaguiProvider config={tamaguiConfig}>
        <TodayScreen />
      </TamaguiProvider>
    </SafeAreaProvider>,
  );

  expect(await screen.findByText('Welcome')).toBeTruthy();
  expect(await screen.findByText('Get Started')).toBeTruthy();
});
