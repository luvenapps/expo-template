import React from 'react';
import { Text } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import { UserOnly } from '@/ui/components/UserOnly';
import { useSessionStore } from '@/auth/session';
import { useRouter } from 'expo-router';

jest.mock('@/auth/session');
jest.mock('expo-router');

const mockReplace = jest.fn();

(useRouter as jest.Mock).mockReturnValue({ replace: mockReplace });

describe('UserOnly', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children when authenticated', () => {
    (useSessionStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({ status: 'authenticated' }),
    );

    const { getByText } = render(
      <UserOnly>
        <Text>Secret Content</Text>
      </UserOnly>,
    );

    expect(getByText('Secret Content')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('redirects when unauthenticated', async () => {
    (useSessionStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({ status: 'unauthenticated' }),
    );

    render(
      <UserOnly>
        <Text>Secret Content</Text>
      </UserOnly>,
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
    });
  });

  it('renders nothing and does not redirect when status is unknown', () => {
    (useSessionStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({ status: 'unknown' }),
    );

    const { queryByText } = render(
      <UserOnly>
        <Text>Secret Content</Text>
      </UserOnly>,
    );

    expect(queryByText('Secret Content')).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
