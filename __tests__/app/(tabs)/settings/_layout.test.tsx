import { describe, test, expect } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';
import SettingsLayout from '../../../../app/(tabs)/settings/_layout';

jest.mock('expo-router', () => {
  const MockStack: any = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  MockStack.displayName = 'MockStack';
  const MockScreen = () => null;
  MockScreen.displayName = 'MockScreen';
  MockStack.Screen = MockScreen;
  return {
    Stack: MockStack,
  };
});

describe('SettingsLayout', () => {
  test('renders without crashing', () => {
    const { toJSON } = render(<SettingsLayout />);
    expect(toJSON()).toMatchInlineSnapshot(`null`);
  });
});
