import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import LoginScreen from '../../../app/(auth)/login';
import { useSessionStore } from '@/auth/session';

jest.mock('@/auth/session', () => ({
  useSessionStore: jest.fn(),
}));

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  Stack: {
    Screen: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  },
  useRouter: () => ({
    back: mockBack,
  }),
}));

const mockedUseSessionStore = useSessionStore as unknown as jest.Mock;

describe('LoginScreen', () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockedUseSessionStore.mockImplementation((selector: any) =>
      selector({
        signInWithEmail: jest.fn().mockResolvedValue({ success: true }),
        isLoading: false,
        error: null,
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
      }),
    );

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Email'), 'user@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password');
    fireEvent.press(getByText('Sign In'));

    expect(signInMock).toHaveBeenCalledWith('user@example.com', 'password');
  });

  test('navigates back on successful login', async () => {
    const signInMock = jest.fn().mockResolvedValue({ success: true });
    mockedUseSessionStore.mockImplementation((selector: any) =>
      selector({
        signInWithEmail: signInMock,
        isLoading: false,
        error: null,
      }),
    );

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Email'), 'user@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password');
    fireEvent.press(getByText('Sign In'));

    // Wait for async signIn to complete
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockBack).toHaveBeenCalled();
  });

  test('disables button when loading', () => {
    mockedUseSessionStore.mockImplementation((selector: any) =>
      selector({
        signInWithEmail: jest.fn(),
        isLoading: true,
        error: null,
      }),
    );

    const { getByText } = render(<LoginScreen />);
    expect(getByText('Signing in…')).toBeTruthy();
  });
});
