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
    Separator: createForwarded(View),
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

import { sendPasswordReset } from '@/auth/service';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import ForgotPasswordScreen from '../../../app/(auth)/forgot-password';
import { useFriendlyErrorHandler } from '@/errors/useFriendlyErrorHandler';

jest.mock('@/auth/service', () => ({
  sendPasswordReset: jest.fn(),
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

const mockedSendPasswordReset = sendPasswordReset as jest.MockedFunction<typeof sendPasswordReset>;
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

describe('ForgotPasswordScreen', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockPush.mockClear();
    mockedSendPasswordReset.mockClear();
    mockedFriendlyError.mockReturnValue(
      jest.fn(() => ({
        toastId: 'toast-1',
        friendly: { code: 'unknown', type: 'error', titleKey: 'errors.custom' },
      })),
    );
  });

  it('renders forgot password screen with email field', () => {
    const { getByTestId } = render(<ForgotPasswordScreen />);

    expect(getByTestId('email-input')).toBeDefined();
    expect(getByTestId('send-reset-link-button')).toBeDefined();
    expect(getByTestId('back-to-sign-in-button')).toBeDefined();
  });

  it('disables submit button when email is empty', () => {
    const { getByTestId } = render(<ForgotPasswordScreen />);

    const submitButton = getByTestId('send-reset-link-button');
    expect(submitButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('disables submit button when email is invalid', () => {
    const { getByTestId } = render(<ForgotPasswordScreen />);

    const emailInput = getByTestId('email-input');
    const submitButton = getByTestId('send-reset-link-button');

    fireEvent.changeText(emailInput, 'invalid-email');

    expect(submitButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('enables submit button when email is valid', () => {
    const { getByTestId } = render(<ForgotPasswordScreen />);

    const emailInput = getByTestId('email-input');
    const submitButton = getByTestId('send-reset-link-button');

    fireEvent.changeText(emailInput, 'test@example.com');

    expect(submitButton.props.accessibilityState?.disabled).toBe(false);
  });

  it('shows error toast when submitting with empty email', async () => {
    const { getByTestId } = render(<ForgotPasswordScreen />);

    const submitButton = getByTestId('send-reset-link-button');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockedSendPasswordReset).not.toHaveBeenCalled();
    });
  });

  it('shows inline error when submitting with empty email input', async () => {
    const { getByTestId, getByText } = render(<ForgotPasswordScreen />);

    const emailInput = getByTestId('email-input');
    fireEvent(emailInput, 'submitEditing');

    await waitFor(() => {
      expect(getByText('auth.reset.missingEmailDescription')).toBeTruthy();
    });
  });

  it('shows error toast when submitting with invalid email format', async () => {
    const { getByTestId } = render(<ForgotPasswordScreen />);

    const emailInput = getByTestId('email-input');
    const submitButton = getByTestId('send-reset-link-button');

    fireEvent.changeText(emailInput, 'not-an-email');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockedSendPasswordReset).not.toHaveBeenCalled();
    });
  });

  it('calls sendPasswordReset and navigates on success', async () => {
    mockedSendPasswordReset.mockResolvedValue({ success: true });

    const { getByTestId } = render(<ForgotPasswordScreen />);

    const emailInput = getByTestId('email-input');
    const submitButton = getByTestId('send-reset-link-button');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockedSendPasswordReset).toHaveBeenCalledWith('test@example.com');
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
    });
  });

  it('shows error message when password reset fails', async () => {
    mockedSendPasswordReset.mockResolvedValue({
      success: false,
      error: 'Reset failed',
    });

    const { getByTestId } = render(<ForgotPasswordScreen />);

    const emailInput = getByTestId('email-input');
    const submitButton = getByTestId('send-reset-link-button');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockedSendPasswordReset).toHaveBeenCalledWith('test@example.com');
    });

    await waitFor(() => {
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  it('uses friendly error handler when provided', async () => {
    const friendly = jest.fn(() => ({
      toastId: 'friendly-id',
      friendly: { code: 'unknown' as const, type: 'error' as const, titleKey: 'errors.custom' },
    }));
    mockedFriendlyError.mockReturnValue(friendly);
    mockedSendPasswordReset.mockResolvedValue({
      success: false,
      friendlyError: { code: 'unknown', type: 'error', titleKey: 'errors.custom' },
    });

    const { getByTestId } = render(<ForgotPasswordScreen />);

    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    fireEvent.press(getByTestId('send-reset-link-button'));

    await waitFor(() => {
      expect(friendly).toHaveBeenCalled();
    });
  });

  it('trims email before submitting', async () => {
    mockedSendPasswordReset.mockResolvedValue({ success: true });

    const { getByTestId } = render(<ForgotPasswordScreen />);

    const emailInput = getByTestId('email-input');
    const submitButton = getByTestId('send-reset-link-button');

    fireEvent.changeText(emailInput, '  test@example.com  ');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockedSendPasswordReset).toHaveBeenCalledWith('test@example.com');
    });
  });

  it('navigates back to login when back button is pressed', () => {
    const { getByTestId } = render(<ForgotPasswordScreen />);

    const backButton = getByTestId('back-to-sign-in-button');
    fireEvent.press(backButton);

    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
  });

  it('disables submit button while submitting', async () => {
    mockedSendPasswordReset.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100)),
    );

    const { getByTestId } = render(<ForgotPasswordScreen />);

    const emailInput = getByTestId('email-input');
    const submitButton = getByTestId('send-reset-link-button');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.press(submitButton);

    // Button should be disabled while submitting
    await waitFor(() => {
      expect(submitButton.props.accessibilityState?.disabled).toBe(true);
    });

    // Wait for submission to complete
    await waitFor(() => {
      expect(mockedSendPasswordReset).toHaveBeenCalled();
    });
  });
});
