import { describe, test, expect } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';
import LoginScreen from '../../../app/(auth)/login';

jest.mock('expo-router', () => {
  const MockStack: any = () => null;
  MockStack.displayName = 'MockStack';
  const MockScreen = () => null;
  MockScreen.displayName = 'MockScreen';
  MockStack.Screen = MockScreen;
  return {
    Stack: MockStack,
  };
});

describe('LoginScreen', () => {
  test('renders login screen with placeholder text', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('Sign in form coming soon.')).toBeTruthy();
  });

  test('renders continue button', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('Continue')).toBeTruthy();
  });
});
