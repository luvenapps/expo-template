import { render } from '@testing-library/react-native';
import React from 'react';
import { Platform } from 'react-native';
import RootRedirect from '../../app/index';

let mockStatus: 'unknown' | 'authenticated' | 'unauthenticated' = 'unauthenticated';

jest.mock('@/auth/session', () => ({
  useSessionStore: (selector: (state: { status: typeof mockStatus }) => unknown) =>
    selector({ status: mockStatus }),
}));

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => href,
  useRouter: () => ({ push: jest.fn() }),
}));

describe('RootRedirect', () => {
  const originalPlatform = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalPlatform, configurable: true });
  });

  test('redirects all native users to tabs', () => {
    mockStatus = 'unauthenticated';
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    const result = render(<RootRedirect />);
    expect(result.toJSON()).toMatchInlineSnapshot(`"/(tabs)"`);
  });
});
