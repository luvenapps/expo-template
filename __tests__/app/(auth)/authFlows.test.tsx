import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SignUpScreen from '../../../app/(auth)/signup';
import ForgotPasswordScreen from '../../../app/(auth)/forgot-password';
import { signUpWithEmail, sendPasswordReset } from '@/auth/service';

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  })),
}));

jest.mock('@/auth/service', () => ({
  signUpWithEmail: jest.fn(),
  sendPasswordReset: jest.fn(),
}));

jest.mock('@tamagui/lucide-icons', () => ({
  Eye: () => null,
  EyeOff: () => null,
}));

jest.mock('tamagui', () => {
  const React = jest.requireActual('react');
  const { View, Text, TextInput, TouchableOpacity } = jest.requireActual('react-native');

  const createForwarded = (Component: any) => {
    const Forwarded = React.forwardRef((props: any, ref: any) =>
      React.createElement(Component, { ...props, ref }, props.children),
    );
    Forwarded.displayName = Component.displayName || Component.name || 'Component';
    return Forwarded;
  };

  const Input = React.forwardRef((props: any, ref: any) =>
    React.createElement(TextInput, { ...props, ref }),
  );
  Input.displayName = 'Input';

  const Button = ({ children, onPress, accessibilityRole, ...rest }: any) =>
    React.createElement(
      TouchableOpacity,
      { onPress, accessibilityRole: accessibilityRole ?? 'button', ...rest },
      typeof children === 'string' ? React.createElement(Text, null, children) : children,
    );

  const Form = Object.assign(
    ({ children, ...props }: any) => React.createElement(View, props, children),
    {
      Trigger: ({ children }: any) => children,
    },
  );

  return {
    Input,
    Button,
    Card: createForwarded(View),
    Form,
    View: createForwarded(View),
    YStack: createForwarded(View),
    XStack: createForwarded(View),
    CaptionText: createForwarded(Text),
    TitleText: createForwarded(Text),
    SubtitleText: createForwarded(Text),
    BodyText: createForwarded(Text),
    Paragraph: createForwarded(Text),
    H1: createForwarded(Text),
    Text: createForwarded(Text),
    useThemeName: jest.fn(() => 'light'),
  };
});

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: jest.fn(),
  }),
  useNavigation: () => ({ canGoBack: jest.fn(() => true) }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', resolvedLanguage: 'en', languages: ['en'] },
  }),
}));

const mockedSignUp = signUpWithEmail as jest.Mock;
const mockedPasswordReset = sendPasswordReset as jest.Mock;

describe('Auth auxiliary flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReplace.mockClear();
  });

  describe('SignUpScreen', () => {
    it('submits sign up form successfully', async () => {
      mockedSignUp.mockResolvedValueOnce({ success: true });
      const { getByTestId } = render(<SignUpScreen />);

      fireEvent.changeText(getByTestId('email-input'), 'new@example.com');
      fireEvent.changeText(getByTestId('password-input'), 'password123');
      fireEvent.changeText(getByTestId('confirm-password-input'), 'password123');

      fireEvent.press(getByTestId('create-account-button'));

      await waitFor(() => {
        expect(mockedSignUp).toHaveBeenCalledWith('new@example.com', 'password123');
        expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
      });
    });

    it('trims whitespace from email before submission', async () => {
      mockedSignUp.mockResolvedValueOnce({ success: true });
      const { getByTestId } = render(<SignUpScreen />);

      fireEvent.changeText(getByTestId('email-input'), '  spaced@example.com  ');
      fireEvent.changeText(getByTestId('password-input'), 'password123');
      fireEvent.changeText(getByTestId('confirm-password-input'), 'password123');

      fireEvent.press(getByTestId('create-account-button'));

      await waitFor(() => {
        expect(mockedSignUp).toHaveBeenCalledWith('spaced@example.com', 'password123');
      });
    });

    it('shows error when passwords do not match', async () => {
      const { getByTestId } = render(<SignUpScreen />);

      fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
      fireEvent.changeText(getByTestId('password-input'), 'password123');
      fireEvent.changeText(getByTestId('confirm-password-input'), 'different123');

      fireEvent.press(getByTestId('create-account-button'));

      await waitFor(() => {
        expect(mockedSignUp).not.toHaveBeenCalled();
      });
    });

    it('shows error when form is incomplete', async () => {
      const { getByTestId } = render(<SignUpScreen />);

      fireEvent.changeText(getByTestId('email-input'), '');
      fireEvent.changeText(getByTestId('password-input'), 'short');
      fireEvent.changeText(getByTestId('confirm-password-input'), 'short');

      fireEvent.press(getByTestId('create-account-button'));

      await waitFor(() => {
        expect(mockedSignUp).not.toHaveBeenCalled();
      });
    });

    it('shows error when password is too short', async () => {
      const { getByTestId } = render(<SignUpScreen />);

      fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
      fireEvent.changeText(getByTestId('password-input'), 'short');
      fireEvent.changeText(getByTestId('confirm-password-input'), 'short');

      fireEvent.press(getByTestId('create-account-button'));

      await waitFor(() => {
        expect(mockedSignUp).not.toHaveBeenCalled();
      });
    });

    it('handles signup error', async () => {
      mockedSignUp.mockResolvedValueOnce({
        success: false,
        error: 'User already exists',
      });

      const { getByTestId } = render(<SignUpScreen />);

      fireEvent.changeText(getByTestId('email-input'), 'existing@example.com');
      fireEvent.changeText(getByTestId('password-input'), 'password123');
      fireEvent.changeText(getByTestId('confirm-password-input'), 'password123');

      fireEvent.press(getByTestId('create-account-button'));

      await waitFor(() => {
        expect(mockedSignUp).toHaveBeenCalled();
        expect(mockReplace).not.toHaveBeenCalled();
      });
    });

    it('handles signup error with friendlyError', async () => {
      mockedSignUp.mockResolvedValueOnce({
        success: false,
        friendlyError: 'This email is already registered',
      });

      const { getByTestId } = render(<SignUpScreen />);

      fireEvent.changeText(getByTestId('email-input'), 'existing@example.com');
      fireEvent.changeText(getByTestId('password-input'), 'password123');
      fireEvent.changeText(getByTestId('confirm-password-input'), 'password123');

      fireEvent.press(getByTestId('create-account-button'));

      await waitFor(() => {
        expect(mockedSignUp).toHaveBeenCalled();
        expect(mockReplace).not.toHaveBeenCalled();
      });
    });

    it('toggles password visibility', () => {
      const { getByTestId } = render(<SignUpScreen />);

      const passwordField = getByTestId('password-input');
      const toggleButton = getByTestId('toggle-password-visibility');

      // Initially secure
      expect(passwordField.props.secureTextEntry).toBe(true);

      // Toggle to show
      fireEvent.press(toggleButton);
      expect(passwordField.props.secureTextEntry).toBe(false);

      // Toggle to hide
      fireEvent.press(toggleButton);
      expect(passwordField.props.secureTextEntry).toBe(true);
    });

    it('toggles confirm password visibility', () => {
      const { getByTestId } = render(<SignUpScreen />);

      const confirmPasswordField = getByTestId('confirm-password-input');
      const toggleButton = getByTestId('toggle-confirm-password-visibility');

      // Initially secure
      expect(confirmPasswordField.props.secureTextEntry).toBe(true);

      // Toggle to show
      fireEvent.press(toggleButton);
      expect(confirmPasswordField.props.secureTextEntry).toBe(false);

      // Toggle to hide
      fireEvent.press(toggleButton);
      expect(confirmPasswordField.props.secureTextEntry).toBe(true);
    });

    it('navigates to login screen when sign in button is pressed', () => {
      const { getByTestId } = render(<SignUpScreen />);

      fireEvent.press(getByTestId('sign-in-button'));

      expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
    });
  });

  describe('ForgotPasswordScreen', () => {
    it('submits forgot password form successfully', async () => {
      mockedPasswordReset.mockResolvedValueOnce({ success: true });
      const { getByTestId } = render(<ForgotPasswordScreen />);

      fireEvent.changeText(getByTestId('email-input'), 'user@example.com');
      fireEvent.press(getByTestId('send-reset-link-button'));

      await waitFor(() => {
        expect(mockedPasswordReset).toHaveBeenCalledWith('user@example.com');
        expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
      });
    });

    it('trims whitespace from email before submission', async () => {
      mockedPasswordReset.mockResolvedValueOnce({ success: true });
      const { getByTestId } = render(<ForgotPasswordScreen />);

      fireEvent.changeText(getByTestId('email-input'), '  spaced@example.com  ');
      fireEvent.press(getByTestId('send-reset-link-button'));

      await waitFor(() => {
        expect(mockedPasswordReset).toHaveBeenCalledWith('spaced@example.com');
      });
    });

    it('shows error when email is empty', async () => {
      const { getByTestId } = render(<ForgotPasswordScreen />);

      fireEvent.changeText(getByTestId('email-input'), '');
      fireEvent.press(getByTestId('send-reset-link-button'));

      await waitFor(() => {
        expect(mockedPasswordReset).not.toHaveBeenCalled();
      });
    });

    it('shows error when email is only whitespace', async () => {
      const { getByTestId } = render(<ForgotPasswordScreen />);

      fireEvent.changeText(getByTestId('email-input'), '   ');
      fireEvent.press(getByTestId('send-reset-link-button'));

      await waitFor(() => {
        expect(mockedPasswordReset).not.toHaveBeenCalled();
      });
    });

    it('handles password reset error', async () => {
      mockedPasswordReset.mockResolvedValueOnce({
        success: false,
        error: 'Email not found',
      });

      const { getByTestId } = render(<ForgotPasswordScreen />);

      fireEvent.changeText(getByTestId('email-input'), 'notfound@example.com');
      fireEvent.press(getByTestId('send-reset-link-button'));

      await waitFor(() => {
        expect(mockedPasswordReset).toHaveBeenCalled();
        expect(mockReplace).not.toHaveBeenCalled();
      });
    });

    it('handles password reset error with friendlyError', async () => {
      mockedPasswordReset.mockResolvedValueOnce({
        success: false,
        friendlyError: 'No account found with this email',
      });

      const { getByTestId } = render(<ForgotPasswordScreen />);

      fireEvent.changeText(getByTestId('email-input'), 'notfound@example.com');
      fireEvent.press(getByTestId('send-reset-link-button'));

      await waitFor(() => {
        expect(mockedPasswordReset).toHaveBeenCalled();
        expect(mockReplace).not.toHaveBeenCalled();
      });
    });

    it('navigates to login screen when back button is pressed', () => {
      const { getByTestId } = render(<ForgotPasswordScreen />);

      fireEvent.press(getByTestId('back-to-sign-in-button'));

      expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
    });
  });
});
