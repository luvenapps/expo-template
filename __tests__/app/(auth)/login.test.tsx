import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import LoginScreen from '../../../app/(auth)/login';
import { useSessionStore } from '@/auth/session';

jest.mock('@/auth/session', () => ({
  useSessionStore: jest.fn(),
}));

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  Stack: {
    Screen: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  },
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

const mockedUseSessionStore = useSessionStore as unknown as jest.Mock;

describe('LoginScreen', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockedUseSessionStore.mockImplementation((selector: any) =>
      selector({
        signInWithEmail: jest.fn().mockResolvedValue({ success: true }),
        isLoading: false,
        error: null,
        status: 'unauthenticated',
      }),
    );
  });

  afterEach(() => {
    mockedUseSessionStore.mockReset();
  });

  test('calls signInWithEmail on submit', async () => {
    const signInMock = jest.fn().mockResolvedValue({ success: true });
    mockedUseSessionStore.mockImplementation((selector: any) =>
      selector({
        signInWithEmail: signInMock,
        isLoading: false,
        error: null,
        status: 'unauthenticated',
      }),
    );

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Email'), 'user@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password');
    fireEvent.press(getByText('Sign In'));

    expect(signInMock).toHaveBeenCalledWith('user@example.com', 'password');
  });

  test('disables button when loading', () => {
    mockedUseSessionStore.mockImplementation((selector: any) =>
      selector({
        signInWithEmail: jest.fn(),
        isLoading: true,
        error: null,
        status: 'unauthenticated',
      }),
    );

    const { getByText } = render(<LoginScreen />);
    expect(getByText('Signing in…')).toBeTruthy();
  });
});
