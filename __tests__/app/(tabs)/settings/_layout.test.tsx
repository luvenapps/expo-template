import { describe, test, expect } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';
import SettingsLayout from '../../../../app/(tabs)/settings/_layout';

let mockThemeContext: { palette: { background: string; text: string } } | null = null;
const capturedScreenProps: any[] = [];
const capturedStackProps: any[] = [];

jest.mock('@/ui/theme/ThemeProvider', () => ({
  useOptionalThemeContext: () => mockThemeContext,
}));

jest.mock('expo-router', () => {
  const MockStack: any = ({ children, ...props }: { children: React.ReactNode }) => {
    capturedStackProps.push(props);
    return <>{children}</>;
  };
  MockStack.displayName = 'MockStack';
  const MockScreen = (props: any) => {
    capturedScreenProps.push(props);
    return null;
  };
  MockScreen.displayName = 'MockScreen';
  MockStack.Screen = MockScreen;
  return {
    Stack: MockStack,
  };
});

describe('SettingsLayout', () => {
  test('applies themed header colors when optional theme context is available', () => {
    mockThemeContext = {
      palette: {
        background: '#101010',
        text: '#f5f5f5',
      },
    };
    capturedStackProps.length = 0;
    render(<SettingsLayout />);

    expect(capturedStackProps[0]?.screenOptions?.headerStyle).toEqual({
      backgroundColor: '#101010',
    });
    expect(capturedStackProps[0]?.screenOptions?.headerTintColor).toBe('#f5f5f5');
    expect(capturedStackProps[0]?.screenOptions?.headerTitleStyle).toEqual({
      color: '#f5f5f5',
    });
  });

  test('index screen disables back button with null headerLeft', () => {
    mockThemeContext = null;
    capturedScreenProps.length = 0;
    render(<SettingsLayout />);

    const indexProps = capturedScreenProps.find((props) => props?.name === 'index');
    expect(indexProps).toBeDefined();
    const options = indexProps?.options as
      | {
          headerBackVisible?: boolean;
          headerLeft?: () => React.ReactNode;
        }
      | undefined;

    expect(options?.headerBackVisible).toBe(false);
    expect(options?.headerLeft).toBeDefined();
    expect(options?.headerLeft?.()).toBeNull();
  });

  test('renders without crashing', () => {
    mockThemeContext = null;
    capturedScreenProps.length = 0;
    capturedStackProps.length = 0;
    const { toJSON } = render(<SettingsLayout />);
    expect(toJSON()).toMatchInlineSnapshot(`null`);
  });
});
