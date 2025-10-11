import { render } from '@testing-library/react-native';
import React from 'react';
import RootRedirect from '../app/index';

const mockRedirect = jest.fn();

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    mockRedirect(href);
    return null;
  },
}));

test('redirects to tabs', () => {
  render(<RootRedirect />);
  expect(mockRedirect).toHaveBeenCalledWith('/(tabs)');
});
