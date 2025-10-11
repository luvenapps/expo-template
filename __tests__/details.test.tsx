import { render, screen } from '@testing-library/react-native';
import React from 'react';
import DetailsScreen from '../app/details';
import { TamaguiProvider } from 'tamagui';
import { tamaguiConfig } from '../tamagui.config';

jest.mock('expo-router', () => ({
  Stack: {
    Screen: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  },
}));

test('shows the details heading', () => {
  render(
    <TamaguiProvider config={tamaguiConfig}>
      <DetailsScreen />
    </TamaguiProvider>,
  );

  expect(screen.getByText('Details')).toBeTruthy();
  expect(screen.getByText(/habit detail view/i)).toBeTruthy();
});
