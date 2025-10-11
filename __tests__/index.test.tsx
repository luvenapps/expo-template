import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { TamaguiProvider } from 'tamagui';
import HomeScreen from '../app/index';
import { tamaguiConfig } from '../tamagui.config';

jest.mock('expo-router', () => ({
  Stack: {
    Screen: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  },
}));

test('renders welcome copy and call to action', () => {
  render(
    <TamaguiProvider config={tamaguiConfig}>
      <HomeScreen />
    </TamaguiProvider>,
  );

  expect(screen.getByText('Welcome')).toBeTruthy();
  expect(screen.getByText('Get Started')).toBeTruthy();
});
