import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Platform } from 'react-native';
import RootRedirect from '../../app/index';

let mockStatus: 'unknown' | 'authenticated' | 'unauthenticated' = 'unauthenticated';
const mockPush = jest.fn();

jest.mock('@/auth/session', () => ({
  useSessionStore: (selector: (state: { status: typeof mockStatus }) => unknown) =>
    selector({ status: mockStatus }),
}));

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => href,
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('RootRedirect', () => {
  const originalPlatform = Platform.OS;
  const originalDocument = global.document;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalPlatform, configurable: true });
    if (originalDocument) {
      global.document = originalDocument;
    } else {
      delete (global as { document?: Document }).document;
    }
    mockPush.mockClear();
  });

  test('redirects all native users to tabs', () => {
    mockStatus = 'unauthenticated';
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    const result = render(<RootRedirect />);
    expect(result.toJSON()).toMatchInlineSnapshot(`"/(tabs)"`);
  });

  test('returns null on web while status is unknown', () => {
    mockStatus = 'unknown';
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });

    const result = render(<RootRedirect />);
    expect(result.toJSON()).toBeNull();
  });

  test('renders auth buttons on web when unauthenticated', () => {
    mockStatus = 'unauthenticated';
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });

    const { getByText } = render(<RootRedirect />);
    fireEvent.press(getByText('landing.signIn'));
    fireEvent.press(getByText('landing.signUp'));

    expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
    expect(mockPush).toHaveBeenCalledWith('/(auth)/signup');
  });

  test('blurs active element on web before navigation', () => {
    mockStatus = 'unauthenticated';
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    const blur = jest.fn();
    const activeElement = { blur } as unknown as Element;
    (global as { document?: { activeElement?: Element } }).document = {
      activeElement,
    };

    const { getByText } = render(<RootRedirect />);
    fireEvent.press(getByText('landing.signIn'));

    expect(blur).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
  });
});
