import { render } from '@testing-library/react-native';
import React from 'react';
import RootRedirect from '../../app/index';

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => href,
}));

describe('RootRedirect', () => {
  test('redirects all users to tabs', () => {
    const result = render(<RootRedirect />);
    expect(result.toJSON()).toMatchInlineSnapshot(`"/(tabs)"`);
  });
});
