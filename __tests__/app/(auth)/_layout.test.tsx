import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';
import { Platform } from 'react-native';
import AuthLayout from '../../../app/(auth)/_layout';

let mockThemeContext: { palette: { background: string; text: string } } | null = null;
let mockSessionStatus = 'unauthenticated';
let mockPathname = '/login';
const capturedStackOptions: any[] = [];
const mockCanGoBack = jest.fn(() => true);
const mockBack = jest.fn();
const mockReplace = jest.fn();

jest.mock('@react-navigation/elements', () => ({
  HeaderBackButton: () => null,
}));

jest.mock('@/auth/session', () => ({
  useSessionStore: (selector: (state: { status: string }) => unknown) =>
    selector({ status: mockSessionStatus }),
}));

jest.mock('@/ui/theme/ThemeProvider', () => ({
  useOptionalThemeContext: () => mockThemeContext,
}));

jest.mock('expo-router', () => {
  const ReactMock = jest.requireActual<typeof React>('react');
  const MockStack: any = ({
    children,
    screenOptions,
  }: {
    children: React.ReactNode;
    screenOptions?: Record<string, any>;
  }) => {
    capturedStackOptions.push(screenOptions);
    return ReactMock.createElement(ReactMock.Fragment, null, children);
  };
  MockStack.displayName = 'MockStack';
  const MockScreen = () => null;
  MockScreen.displayName = 'MockScreen';
  MockStack.Screen = MockScreen;
  const Redirect = ({ href }: { href: string }) =>
    ReactMock.createElement('Redirect', { href, testID: 'auth-redirect' });

  return {
    Stack: MockStack,
    Redirect,
    useRouter: jest.fn(() => ({
      canGoBack: mockCanGoBack,
      back: mockBack,
      replace: mockReplace,
    })),
    usePathname: jest.fn(() => mockPathname),
  };
});

describe('AuthLayout', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    mockThemeContext = null;
    mockSessionStatus = 'unauthenticated';
    mockPathname = '/login';
    capturedStackOptions.length = 0;
    mockCanGoBack.mockReset().mockReturnValue(true);
    mockBack.mockReset();
    mockReplace.mockReset();
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalPlatform, configurable: true });
  });

  test('uses the selected theme for its header and back button', async () => {
    mockThemeContext = {
      palette: {
        background: '#0A0B0D',
        text: '#F5F5F5',
      },
    };
    capturedStackOptions.length = 0;

    await render(<AuthLayout />);

    const screenOptions = capturedStackOptions[0];
    expect(screenOptions.headerStyle).toEqual({ backgroundColor: '#0A0B0D' });
    expect(screenOptions.headerTintColor).toBe('#F5F5F5');
    expect(screenOptions.headerTitleStyle).toEqual({ color: '#F5F5F5' });
    expect(screenOptions.headerLeft().props.tintColor).toBe('#F5F5F5');
  });

  test('returns null on web while the session is unknown', async () => {
    mockSessionStatus = 'unknown';
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });

    const result = await render(<AuthLayout />);

    expect(result.toJSON()).toBeNull();
  });

  test('redirects authenticated web users away from auth screens', async () => {
    mockSessionStatus = 'authenticated';
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });

    const result = await render(<AuthLayout />);

    expect(result.getByTestId('auth-redirect').props.href).toBe('/');
  });

  test('keeps the web auth callback and uses the selected back-button color', async () => {
    mockSessionStatus = 'authenticated';
    mockPathname = '/auth-callback';
    mockThemeContext = { palette: { background: '#0A0B0D', text: '#F5F5F5' } };
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });

    await render(<AuthLayout />);

    const screenOptions = capturedStackOptions[0];
    expect(screenOptions.headerLeft().props.tintColor).toBe('#F5F5F5');
    screenOptions.headerLeft().props.onPress();
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('uses the tabs route when the native router has no back history', async () => {
    mockCanGoBack.mockReturnValue(false);

    await render(<AuthLayout />);

    capturedStackOptions[0].headerLeft().props.onPress();

    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });
});
