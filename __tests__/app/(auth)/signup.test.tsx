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

jest.mock('@tamagui/lucide-icons', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    Eye: (props: any) => React.createElement(View, { ...props, testID: 'eye-icon' }),
    EyeOff: (props: any) => React.createElement(View, { ...props, testID: 'eye-off-icon' }),
  };
});

import { signUpWithEmail } from '@/auth/service';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import SignUpScreen from '../../../app/(auth)/signup';
import { useFriendlyErrorHandler } from '@/errors/useFriendlyErrorHandler';

jest.mock('@/auth/service', () => ({
  signUpWithEmail: jest.fn(),
}));

jest.mock('@/errors/useFriendlyErrorHandler', () => ({
  useFriendlyErrorHandler: jest.fn(),
}));

const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
}));

const mockedSignUpWithEmail = signUpWithEmail as jest.MockedFunction<typeof signUpWithEmail>;
const mockedFriendlyError = useFriendlyErrorHandler as jest.MockedFunction<
  typeof useFriendlyErrorHandler
>;

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

describe('SignUpScreen', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockPush.mockClear();
    mockedSignUpWithEmail.mockClear();
    mockedFriendlyError.mockReturnValue(
      jest.fn(() => ({
        friendly: { code: 'unknown' as const, type: 'error' as const, titleKey: 'errors.signup' },
        toastId: 'toast-1',
      })),
    );
  });

  it('renders signup screen with all fields', () => {
    const { getByTestId } = render(<SignUpScreen />);

    expect(getByTestId('email-input')).toBeDefined();
    expect(getByTestId('password-input')).toBeDefined();
    expect(getByTestId('confirm-password-input')).toBeDefined();
    expect(getByTestId('create-account-button')).toBeDefined();
    expect(getByTestId('sign-in-button')).toBeDefined();
  });

  it('disables submit button when email is empty', () => {
    const { getByTestId } = render(<SignUpScreen />);

    const passwordInput = getByTestId('password-input');
    const confirmPasswordInput = getByTestId('confirm-password-input');
    const submitButton = getByTestId('create-account-button');

    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.changeText(confirmPasswordInput, 'password123');

    expect(submitButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('disables submit button when password is less than 8 characters', () => {
    const { getByTestId } = render(<SignUpScreen />);

    const emailInput = getByTestId('email-input');
    const passwordInput = getByTestId('password-input');
    const confirmPasswordInput = getByTestId('confirm-password-input');
    const submitButton = getByTestId('create-account-button');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'short');
    fireEvent.changeText(confirmPasswordInput, 'short');

    expect(submitButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('disables submit button when confirm password is less than 8 characters', () => {
    const { getByTestId } = render(<SignUpScreen />);

    const emailInput = getByTestId('email-input');
    const passwordInput = getByTestId('password-input');
    const confirmPasswordInput = getByTestId('confirm-password-input');
    const submitButton = getByTestId('create-account-button');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.changeText(confirmPasswordInput, 'short');

    expect(submitButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('enables submit button when all fields are valid', () => {
    const { getByTestId } = render(<SignUpScreen />);

    const emailInput = getByTestId('email-input');
    const passwordInput = getByTestId('password-input');
    const confirmPasswordInput = getByTestId('confirm-password-input');
    const submitButton = getByTestId('create-account-button');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.changeText(confirmPasswordInput, 'password123');

    expect(submitButton.props.accessibilityState?.disabled).toBe(false);
  });

  it('toggles password visibility when eye icon is pressed', () => {
    const { getByTestId } = render(<SignUpScreen />);

    const passwordInput = getByTestId('password-input');
    const toggleButton = getByTestId('toggle-password-visibility');

    // Initially password should be hidden (secureTextEntry = true)
    expect(passwordInput.props.secureTextEntry).toBe(true);

    // Click to show password
    fireEvent.press(toggleButton);
    expect(passwordInput.props.secureTextEntry).toBe(false);

    // Click again to hide password
    fireEvent.press(toggleButton);
    expect(passwordInput.props.secureTextEntry).toBe(true);
  });

  it('toggles confirm password visibility when eye icon is pressed', () => {
    const { getByTestId } = render(<SignUpScreen />);

    const confirmPasswordInput = getByTestId('confirm-password-input');
    const toggleButton = getByTestId('toggle-confirm-password-visibility');

    // Initially password should be hidden (secureTextEntry = true)
    expect(confirmPasswordInput.props.secureTextEntry).toBe(true);

    // Click to show password
    fireEvent.press(toggleButton);
    expect(confirmPasswordInput.props.secureTextEntry).toBe(false);

    // Click again to hide password
    fireEvent.press(toggleButton);
    expect(confirmPasswordInput.props.secureTextEntry).toBe(true);
  });

  it('shows error when passwords do not match', async () => {
    const { getByTestId } = render(<SignUpScreen />);

    const emailInput = getByTestId('email-input');
    const passwordInput = getByTestId('password-input');
    const confirmPasswordInput = getByTestId('confirm-password-input');
    const submitButton = getByTestId('create-account-button');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.changeText(confirmPasswordInput, 'different456');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockedSignUpWithEmail).not.toHaveBeenCalled();
    });
  });

  it('shows error toast when submitting with invalid form', async () => {
    const { getByTestId } = render(<SignUpScreen />);

    const submitButton = getByTestId('create-account-button');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockedSignUpWithEmail).not.toHaveBeenCalled();
    });
  });

  it('calls signUpWithEmail and navigates on success', async () => {
    mockedSignUpWithEmail.mockResolvedValue({ success: true });

    const { getByTestId } = render(<SignUpScreen />);

    const emailInput = getByTestId('email-input');
    const passwordInput = getByTestId('password-input');
    const confirmPasswordInput = getByTestId('confirm-password-input');
    const submitButton = getByTestId('create-account-button');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.changeText(confirmPasswordInput, 'password123');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockedSignUpWithEmail).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
    });
  });

  it('shows error message when signup fails', async () => {
    mockedSignUpWithEmail.mockResolvedValue({
      success: false,
      error: 'Signup failed',
    });

    const { getByTestId } = render(<SignUpScreen />);

    const emailInput = getByTestId('email-input');
    const passwordInput = getByTestId('password-input');
    const confirmPasswordInput = getByTestId('confirm-password-input');
    const submitButton = getByTestId('create-account-button');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.changeText(confirmPasswordInput, 'password123');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockedSignUpWithEmail).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    await waitFor(() => {
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  it('uses friendly error handler when provided', async () => {
    const friendly = jest.fn(() => ({
      friendly: { code: 'unknown' as const, type: 'error' as const, titleKey: 'errors.signup' },
      toastId: 'toast-2',
    }));
    mockedFriendlyError.mockReturnValue(friendly);
    mockedSignUpWithEmail.mockResolvedValue({
      success: false,
      friendlyError: { code: 'unknown', type: 'error', descriptionKey: 'errors.signup' },
    });

    const { getByTestId } = render(<SignUpScreen />);

    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.changeText(getByTestId('confirm-password-input'), 'password123');
    fireEvent.press(getByTestId('create-account-button'));

    await waitFor(() => {
      expect(friendly).toHaveBeenCalled();
    });
  });

  it('trims email before submitting', async () => {
    mockedSignUpWithEmail.mockResolvedValue({ success: true });

    const { getByTestId } = render(<SignUpScreen />);

    const emailInput = getByTestId('email-input');
    const passwordInput = getByTestId('password-input');
    const confirmPasswordInput = getByTestId('confirm-password-input');
    const submitButton = getByTestId('create-account-button');

    fireEvent.changeText(emailInput, '  test@example.com  ');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.changeText(confirmPasswordInput, 'password123');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockedSignUpWithEmail).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('navigates to login when sign in button is pressed', () => {
    const { getByTestId } = render(<SignUpScreen />);

    const signInButton = getByTestId('sign-in-button');
    fireEvent.press(signInButton);

    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
  });

  it('disables submit button while submitting', async () => {
    mockedSignUpWithEmail.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100)),
    );

    const { getByTestId } = render(<SignUpScreen />);

    const emailInput = getByTestId('email-input');
    const passwordInput = getByTestId('password-input');
    const confirmPasswordInput = getByTestId('confirm-password-input');
    const submitButton = getByTestId('create-account-button');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.changeText(confirmPasswordInput, 'password123');
    fireEvent.press(submitButton);

    // Button should be disabled while submitting
    await waitFor(() => {
      expect(submitButton.props.accessibilityState?.disabled).toBe(true);
    });

    // Wait for submission to complete
    await waitFor(() => {
      expect(mockedSignUpWithEmail).toHaveBeenCalled();
    });
  });
});
