// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  })),
}));

// Mock ThemeProvider
jest.mock('@/ui/theme/ThemeProvider', () => {
  const { themePalettes } = jest.requireActual('@/ui/theme/palette');
  return {
    useThemeContext: jest.fn(() => ({
      resolvedTheme: 'light',
      palette: {
        background: themePalettes.light.background,
        text: themePalettes.light.text,
        mutedText: themePalettes.light.mutedText,
      },
    })),
  };
});

// Mock Tamagui Lucide Icons
jest.mock('@tamagui/lucide-icons', () => {
  const mockReact = jest.requireActual('react');
  const FakeIcon = ({ testID }: { testID: string }) => mockReact.createElement('View', { testID });
  return {
    Eye: () => mockReact.createElement(FakeIcon, { testID: 'eye-icon' }),
    EyeOff: () => mockReact.createElement(FakeIcon, { testID: 'eye-off-icon' }),
    Apple: () => mockReact.createElement(FakeIcon, { testID: 'apple-icon' }),
    Github: () => mockReact.createElement(FakeIcon, { testID: 'github-icon' }),
  };
});

jest.mock('tamagui', () => {
  const actual = jest.requireActual('tamagui');
  const React = jest.requireActual('react');
  const { View, Text, TextInput, TouchableOpacity } = jest.requireActual('react-native');

  const createForwarded = (Component: any) => {
    const ForwardedComponent = React.forwardRef((props: any, ref: any) =>
      React.createElement(Component, { ...props, ref }, props.children),
    );
    ForwardedComponent.displayName = `Forwarded(${Component.displayName || Component.name || 'Component'})`;
    return ForwardedComponent;
  };

  const Input = React.forwardRef((props: any, ref: any) =>
    React.createElement(TextInput, { ...props, ref }),
  );
  Input.displayName = 'Input';

  const Button = ({ children, onPress, ...rest }: any) =>
    React.createElement(
      TouchableOpacity,
      { onPress, accessibilityRole: 'button', ...rest },
      typeof children === 'string' ? React.createElement(Text, null, children) : children,
    );

  const Form = Object.assign(
    ({ children, onSubmit, ...rest }: any) =>
      React.createElement(View, { ...rest, onSubmit }, children),
    {
      Trigger: ({ children }: any) => children,
    },
  );

  return {
    ...actual,
    Input,
    Button,
    YStack: createForwarded(View),
    XStack: createForwarded(View),
    Paragraph: createForwarded(Text),
    H1: createForwarded(Text),
    Text: createForwarded(Text),
    View: createForwarded(View),
    Card: createForwarded(View),
    Form,
    useThemeName: jest.fn(() => 'light'),
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', resolvedLanguage: 'en', languages: ['en'] },
  }),
}));

import { fireEvent, render, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import LoginScreen from '../../../app/(auth)/login';
import { useSessionStore } from '@/auth/session';
import { Platform } from 'react-native';

jest.mock('@/auth/session', () => ({
  useSessionStore: jest.fn(),
}));

const mockHandleFriendlyError = jest.fn();
jest.mock('@/errors/useFriendlyErrorHandler', () => ({
  useFriendlyErrorHandler: () => mockHandleFriendlyError,
}));

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);
let focusEffectCallback: (() => void) | null = null;

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
    back: mockBack,
  }),
  useNavigation: () => ({
    canGoBack: mockCanGoBack,
  }),
  useFocusEffect: jest.fn((cb: any) => {
    focusEffectCallback = cb;
  }),
}));

const mockedUseSessionStore = useSessionStore as unknown as jest.Mock;

// Suppress act() warnings - these are expected for async updates in handleSubmit
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('not wrapped in act') || args[0].includes('not configured to support act'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

describe('LoginScreen', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockPush.mockClear();
    mockBack.mockClear();
    mockCanGoBack.mockClear();
    mockCanGoBack.mockReturnValue(true);
    focusEffectCallback = null;
    mockedUseSessionStore.mockImplementation((selector: any) =>
      selector({
        signInWithEmail: jest.fn().mockResolvedValue({ success: true }),
        signInWithOAuth: jest.fn().mockResolvedValue({ success: true }),
        setError: jest.fn(),
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
        signInWithOAuth: jest.fn().mockResolvedValue({ success: true }),
        setError: jest.fn(),
        isLoading: false,
        error: null,
      }),
    );

    const { getByTestId } = render(<LoginScreen />);

    fireEvent.changeText(getByTestId('email-input'), 'user@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password');

    await act(async () => {
      fireEvent.press(getByTestId('sign-in-button'));
      await waitFor(() => {
        expect(signInMock).toHaveBeenCalledWith('user@example.com', 'password');
      });
    });
  });

  test('navigates back on successful login', async () => {
    const signInMock = jest.fn().mockResolvedValue({ success: true });
    mockedUseSessionStore.mockImplementation((selector: any) =>
      selector({
        signInWithEmail: signInMock,
        signInWithOAuth: jest.fn().mockResolvedValue({ success: true }),
        setError: jest.fn(),
        isLoading: false,
        error: null,
      }),
    );

    const { getByTestId } = render(<LoginScreen />);

    fireEvent.changeText(getByTestId('email-input'), 'user@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password');

    await act(async () => {
      fireEvent.press(getByTestId('sign-in-button'));
      await waitFor(() => {
        expect(mockBack).toHaveBeenCalled();
      });
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('forgot password link navigates to reset screen', () => {
    const { getByTestId } = render(<LoginScreen />);
    fireEvent.press(getByTestId('forgot-password-link'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/forgot-password');
  });

  test('disables button when loading', () => {
    mockedUseSessionStore.mockImplementation((selector: any) =>
      selector({
        signInWithEmail: jest.fn(),
        setError: jest.fn(),
        isLoading: true,
        error: null,
      }),
    );

    const { getByTestId } = render(<LoginScreen />);
    const signInButton = getByTestId('sign-in-button');
    expect(signInButton).toBeTruthy();
  });

  test('displays error message when error is present', () => {
    mockedUseSessionStore.mockImplementation((selector: any) =>
      selector({
        signInWithEmail: jest.fn(),
        setError: jest.fn(),
        isLoading: false,
        error: 'Invalid email or password',
      }),
    );

    const { getByTestId } = render(<LoginScreen />);
    expect(getByTestId('error-message')).toBeTruthy();
  });

  test('does not navigate on failed login', async () => {
    const signInMock = jest
      .fn()
      .mockResolvedValue({ success: false, error: 'Authentication failed' });
    const setErrorMock = jest.fn();
    mockedUseSessionStore.mockImplementation((selector: any) =>
      selector({
        signInWithEmail: signInMock,
        setError: setErrorMock,
        isLoading: false,
        error: null,
      }),
    );

    const { getByTestId } = render(<LoginScreen />);

    fireEvent.changeText(getByTestId('email-input'), 'user@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'wrongpassword');

    await act(async () => {
      fireEvent.press(getByTestId('sign-in-button'));
      // Wait for async signIn to complete
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockBack).not.toHaveBeenCalled();
    expect(setErrorMock).toHaveBeenCalled();
  });

  test('sets friendly error description when provided', async () => {
    const signInMock = jest.fn().mockResolvedValue({
      success: false,
      friendlyError: { descriptionKey: 'auth.login.invalidCredentials' },
    });
    const setErrorMock = jest.fn();
    mockedUseSessionStore.mockImplementation((selector: any) =>
      selector({
        signInWithEmail: signInMock,
        signInWithOAuth: jest.fn().mockResolvedValue({ success: true }),
        setError: setErrorMock,
        isLoading: false,
        error: null,
      }),
    );

    const { getByTestId } = render(<LoginScreen />);
    fireEvent.changeText(getByTestId('email-input'), 'user@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password');

    await act(async () => {
      fireEvent.press(getByTestId('sign-in-button'));
      await waitFor(() => expect(signInMock).toHaveBeenCalled());
    });

    expect(setErrorMock).toHaveBeenCalledWith('auth.login.invalidCredentials');
  });

  test('sets raw error string when no friendly error is provided', async () => {
    const signInMock = jest.fn().mockResolvedValue({
      success: false,
      error: 'plain-error',
    });
    const setErrorMock = jest.fn();
    mockedUseSessionStore.mockImplementation((selector: any) =>
      selector({
        signInWithEmail: signInMock,
        signInWithOAuth: jest.fn().mockResolvedValue({ success: true }),
        setError: setErrorMock,
        isLoading: false,
        error: null,
      }),
    );

    const { getByTestId } = render(<LoginScreen />);
    fireEvent.changeText(getByTestId('email-input'), 'user@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password');

    await act(async () => {
      fireEvent.press(getByTestId('sign-in-button'));
      await waitFor(() => expect(signInMock).toHaveBeenCalled());
    });

    expect(setErrorMock).toHaveBeenCalledWith('plain-error');
  });

  test('toggles password visibility when eye icon is pressed', () => {
    const { getByTestId } = render(<LoginScreen />);
    const passwordInput = getByTestId('password-input');

    // Initially password should be hidden
    expect(passwordInput.props.secureTextEntry).toBe(true);

    // Press show password button
    const toggleButton = getByTestId('toggle-password-visibility');
    fireEvent.press(toggleButton);

    // Password should now be visible
    expect(passwordInput.props.secureTextEntry).toBe(false);

    // Press hide password button
    fireEvent.press(toggleButton);

    // Password should be hidden again
    expect(passwordInput.props.secureTextEntry).toBe(true);
  });

  test('focuses password field when email submit is pressed', () => {
    const { getByTestId } = render(<LoginScreen />);
    const emailInput = getByTestId('email-input');

    // Should not throw when onSubmitEditing is called
    expect(() => {
      fireEvent(emailInput, 'submitEditing');
    }).not.toThrow();
  });

  test('replaces to tabs when no history exists', async () => {
    mockCanGoBack.mockReturnValue(false);
    const { getByTestId } = render(<LoginScreen />);

    fireEvent.changeText(getByTestId('email-input'), 'user@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password');

    await act(async () => {
      fireEvent.press(getByTestId('sign-in-button'));
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
      });
    });

    expect(mockBack).not.toHaveBeenCalled();
  });

  test('navigates to signup when create account button is pressed', () => {
    const { getByTestId } = render(<LoginScreen />);
    fireEvent.press(getByTestId('create-account-button'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/signup');
  });

  test('disables submit button when email is invalid', () => {
    const { getByTestId } = render(<LoginScreen />);

    const emailInput = getByTestId('email-input');
    const passwordInput = getByTestId('password-input');
    const submitButton = getByTestId('sign-in-button');

    fireEvent.changeText(emailInput, 'invalid-email');
    fireEvent.changeText(passwordInput, 'password123');

    expect(submitButton.props.accessibilityState?.disabled).toBe(true);
  });

  test('handles friendly error messages from auth service', async () => {
    const signInMock = jest.fn().mockResolvedValue({
      success: false,
      error: 'auth/invalid-credential',
      friendlyError: 'auth.login.invalidCredentials',
    });
    const setErrorMock = jest.fn();
    mockedUseSessionStore.mockImplementation((selector: any) =>
      selector({
        signInWithEmail: signInMock,
        signInWithOAuth: jest.fn().mockResolvedValue({ success: true }),
        setError: setErrorMock,
        isLoading: false,
        error: null,
      }),
    );

    const { getByTestId } = render(<LoginScreen />);

    fireEvent.changeText(getByTestId('email-input'), 'user@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'wrongpassword');

    await act(async () => {
      fireEvent.press(getByTestId('sign-in-button'));
      await waitFor(() => {
        expect(signInMock).toHaveBeenCalled();
      });
    });

    expect(mockBack).not.toHaveBeenCalled();
    expect(setErrorMock).toHaveBeenCalledWith('auth.login.invalidCredentials');
  });

  test('uses description fallback when provided by handleFriendlyError', async () => {
    const signInMock = jest.fn().mockResolvedValue({
      success: false,
      friendlyError: {},
    });
    const setErrorMock = jest.fn();
    mockHandleFriendlyError.mockReturnValueOnce({
      friendly: { description: 'Friendly description', type: 'error', code: 'test' },
    });
    mockedUseSessionStore.mockImplementation((selector: any) =>
      selector({
        signInWithEmail: signInMock,
        signInWithOAuth: jest.fn().mockResolvedValue({ success: true }),
        setError: setErrorMock,
        isLoading: false,
        error: null,
      }),
    );

    const { getByTestId } = render(<LoginScreen />);
    fireEvent.changeText(getByTestId('email-input'), 'user@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password');

    await act(async () => {
      fireEvent.press(getByTestId('sign-in-button'));
      await waitFor(() => expect(signInMock).toHaveBeenCalled());
    });

    expect(setErrorMock).toHaveBeenCalledWith('Friendly description');
  });

  test('uses descriptionKey fallback when description is missing', async () => {
    const signInMock = jest.fn().mockResolvedValue({
      success: false,
      friendlyError: {},
    });
    const setErrorMock = jest.fn();
    mockHandleFriendlyError.mockReturnValueOnce({
      friendly: { descriptionKey: 'errors.auth.invalid', type: 'error', code: 'test' },
    });
    mockedUseSessionStore.mockImplementation((selector: any) =>
      selector({
        signInWithEmail: signInMock,
        signInWithOAuth: jest.fn().mockResolvedValue({ success: true }),
        setError: setErrorMock,
        isLoading: false,
        error: null,
      }),
    );

    const { getByTestId } = render(<LoginScreen />);
    fireEvent.changeText(getByTestId('email-input'), 'user@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password');

    await act(async () => {
      fireEvent.press(getByTestId('sign-in-button'));
      await waitFor(() => expect(signInMock).toHaveBeenCalled());
    });

    expect(setErrorMock).toHaveBeenCalledWith('errors.auth.invalid');
  });

  test('uses title fallback when description and descriptionKey are missing', async () => {
    const signInMock = jest.fn().mockResolvedValue({
      success: false,
      friendlyError: {},
    });
    const setErrorMock = jest.fn();
    mockHandleFriendlyError.mockReturnValueOnce({
      friendly: { title: 'Error Title', type: 'error', code: 'test' },
    });
    mockedUseSessionStore.mockImplementation((selector: any) =>
      selector({
        signInWithEmail: signInMock,
        signInWithOAuth: jest.fn().mockResolvedValue({ success: true }),
        setError: setErrorMock,
        isLoading: false,
        error: null,
      }),
    );

    const { getByTestId } = render(<LoginScreen />);
    fireEvent.changeText(getByTestId('email-input'), 'user@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password');

    await act(async () => {
      fireEvent.press(getByTestId('sign-in-button'));
      await waitFor(() => expect(signInMock).toHaveBeenCalled());
    });

    expect(setErrorMock).toHaveBeenCalledWith('Error Title');
  });

  test('uses titleKey fallback when other fields are missing', async () => {
    const signInMock = jest.fn().mockResolvedValue({
      success: false,
      friendlyError: {},
    });
    const setErrorMock = jest.fn();
    mockHandleFriendlyError.mockReturnValueOnce({
      friendly: { titleKey: 'errors.auth.failed', type: 'error', code: 'test' },
    });
    mockedUseSessionStore.mockImplementation((selector: any) =>
      selector({
        signInWithEmail: signInMock,
        signInWithOAuth: jest.fn().mockResolvedValue({ success: true }),
        setError: setErrorMock,
        isLoading: false,
        error: null,
      }),
    );

    const { getByTestId } = render(<LoginScreen />);
    fireEvent.changeText(getByTestId('email-input'), 'user@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password');

    await act(async () => {
      fireEvent.press(getByTestId('sign-in-button'));
      await waitFor(() => expect(signInMock).toHaveBeenCalled());
    });

    expect(setErrorMock).toHaveBeenCalledWith('errors.auth.failed');
  });

  test('uses unknown error fallback when all fields are missing', async () => {
    const signInMock = jest.fn().mockResolvedValue({
      success: false,
      friendlyError: {},
    });
    const setErrorMock = jest.fn();
    mockHandleFriendlyError.mockReturnValueOnce({
      friendly: { type: 'error', code: 'test' },
    });
    mockedUseSessionStore.mockImplementation((selector: any) =>
      selector({
        signInWithEmail: signInMock,
        signInWithOAuth: jest.fn().mockResolvedValue({ success: true }),
        setError: setErrorMock,
        isLoading: false,
        error: null,
      }),
    );

    const { getByTestId } = render(<LoginScreen />);
    fireEvent.changeText(getByTestId('email-input'), 'user@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password');

    await act(async () => {
      fireEvent.press(getByTestId('sign-in-button'));
      await waitFor(() => expect(signInMock).toHaveBeenCalled());
    });

    expect(setErrorMock).toHaveBeenCalledWith('auth.errorUnknown');
  });

  test('resets form on focus', async () => {
    const setErrorMock = jest.fn();
    mockedUseSessionStore.mockImplementation((selector: any) =>
      selector({
        signInWithEmail: jest.fn().mockResolvedValue({ success: true }),
        signInWithOAuth: jest.fn().mockResolvedValue({ success: true }),
        setError: setErrorMock,
        isLoading: false,
        error: 'Existing error',
      }),
    );

    const { getByTestId } = render(<LoginScreen />);
    fireEvent.changeText(getByTestId('email-input'), 'user@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password');
    // simulate screen focus
    act(() => {
      focusEffectCallback?.();
    });

    await waitFor(() => {
      expect(getByTestId('email-input').props.value).toBe('');
      expect(getByTestId('password-input').props.value).toBe('');
      expect(setErrorMock).toHaveBeenCalledWith(null);
    });
  });
});
describe('OAuth authentication', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockBack.mockClear();
    mockCanGoBack.mockClear();
  });

  test('hides Apple button on Android', () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'android' });
    const { queryByTestId, getByTestId } = render(<LoginScreen />);
    expect(queryByTestId('oauth-apple-button')).toBeNull();
    expect(getByTestId('oauth-google-button')).toBeTruthy();
    Object.defineProperty(Platform, 'OS', { value: originalOS });
  });

  test('handles OAuth sign in', async () => {
    mockCanGoBack.mockReturnValue(true);
    const oauthMock = jest.fn().mockResolvedValue({ success: true });
    mockedUseSessionStore.mockImplementation((selector: any) =>
      selector({
        signInWithEmail: jest.fn().mockResolvedValue({ success: true }),
        signInWithOAuth: oauthMock,
        setError: jest.fn(),
        isLoading: false,
        error: null,
      }),
    );

    const { getByTestId } = render(<LoginScreen />);
    await act(async () => {
      fireEvent.press(getByTestId('oauth-google-button'));
    });
    expect(oauthMock).toHaveBeenCalledWith('google');
  });

  test('navigates back on successful OAuth login when canGoBack is true', async () => {
    mockCanGoBack.mockReturnValue(true);
    const oauthMock = jest.fn().mockResolvedValue({ success: true });
    mockedUseSessionStore.mockImplementation((selector: any) =>
      selector({
        signInWithEmail: jest.fn().mockResolvedValue({ success: true }),
        signInWithOAuth: oauthMock,
        setError: jest.fn(),
        isLoading: false,
        error: null,
      }),
    );

    const { getByTestId } = render(<LoginScreen />);
    await act(async () => {
      fireEvent.press(getByTestId('oauth-google-button'));
      await waitFor(() => {
        expect(mockBack).toHaveBeenCalled();
      });
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('replaces to tabs on successful OAuth login when canGoBack is false', async () => {
    mockCanGoBack.mockReturnValue(false);
    const oauthMock = jest.fn().mockResolvedValue({ success: true });
    mockedUseSessionStore.mockImplementation((selector: any) =>
      selector({
        signInWithEmail: jest.fn().mockResolvedValue({ success: true }),
        signInWithOAuth: oauthMock,
        setError: jest.fn(),
        isLoading: false,
        error: null,
      }),
    );

    const { getByTestId } = render(<LoginScreen />);
    await act(async () => {
      fireEvent.press(getByTestId('oauth-google-button'));
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
      });
    });
    expect(mockBack).not.toHaveBeenCalled();
  });

  test('handles OAuth sign in failure', async () => {
    mockCanGoBack.mockReturnValue(true);
    const oauthMock = jest
      .fn()
      .mockResolvedValue({ success: false, error: 'OAuth authentication failed' });
    mockedUseSessionStore.mockImplementation((selector: any) =>
      selector({
        signInWithEmail: jest.fn().mockResolvedValue({ success: true }),
        signInWithOAuth: oauthMock,
        setError: jest.fn(),
        isLoading: false,
        error: null,
      }),
    );

    const { getByTestId } = render(<LoginScreen />);
    await act(async () => {
      fireEvent.press(getByTestId('oauth-google-button'));
      // Wait for async OAuth to complete
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockBack).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('handles OAuth sign in for Apple provider', async () => {
    mockCanGoBack.mockReturnValue(true);
    const oauthMock = jest.fn().mockResolvedValue({ success: true });
    mockedUseSessionStore.mockImplementation((selector: any) =>
      selector({
        signInWithEmail: jest.fn().mockResolvedValue({ success: true }),
        signInWithOAuth: oauthMock,
        setError: jest.fn(),
        isLoading: false,
        error: null,
      }),
    );

    const { getByTestId } = render(<LoginScreen />);
    await act(async () => {
      fireEvent.press(getByTestId('oauth-apple-button'));
    });
    expect(oauthMock).toHaveBeenCalledWith('apple');
  });
});
