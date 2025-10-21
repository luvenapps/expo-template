import { render } from '@testing-library/react-native';
import React from 'react';
import RootRedirect from '../../app/index';
import { useSessionStore } from '@/auth/session';

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => href,
}));

jest.mock('@/auth/session', () => ({
  useSessionStore: jest.fn(),
}));

const mockedUseSessionStore = useSessionStore as unknown as jest.Mock;

const renderForStatus = (status: 'unknown' | 'authenticated' | 'unauthenticated') => {
  mockedUseSessionStore.mockImplementation((selector: any) => selector({ status }));
  return render(<RootRedirect />);
};

describe('RootRedirect', () => {
  afterEach(() => {
    jest.resetModules();
    mockedUseSessionStore.mockReset();
  });

  test('renders null while status unknown', () => {
    const result = renderForStatus('unknown');
    expect(result.toJSON()).toBeNull();
  });

  test('redirects to tabs when authenticated', () => {
    const result = renderForStatus('authenticated');
    expect(result.toJSON()).toMatchInlineSnapshot(`"/(tabs)"`);
  });

  test('redirects to login when unauthenticated', () => {
    const result = renderForStatus('unauthenticated');
    expect(result.toJSON()).toMatchInlineSnapshot(`"/(auth)/login"`);
  });
});
