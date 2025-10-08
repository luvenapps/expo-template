import { render, screen } from '@testing-library/react-native';
import React from 'react';
import DetailsScreen from '../app/details';

jest.mock('expo-router', () => ({
  Stack: {
    Screen: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  },
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

test('shows the details heading', () => {
  render(<DetailsScreen />);

  expect(screen.getByText('Details')).toBeTruthy();
});
