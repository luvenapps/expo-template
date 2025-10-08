import { render, screen } from '@testing-library/react-native';
import React from 'react';
import HomeScreen from '../app/index';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  Stack: {
    Screen: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  },
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

test('renders welcome message and details button', () => {
  render(<HomeScreen />);

  expect(screen.getByText('Welcome')).toBeTruthy();
  expect(screen.getByText('View Details')).toBeTruthy();
});
