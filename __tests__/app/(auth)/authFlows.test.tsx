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

const mockedSignUp = signUpWithEmail as jest.Mock;
const mockedPasswordReset = sendPasswordReset as jest.Mock;

describe('Auth auxiliary flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReplace.mockClear();
  });

  it('submits sign up form', async () => {
    mockedSignUp.mockResolvedValueOnce({ success: true });
    const { getByPlaceholderText, getByText } = render(<SignUpScreen />);

    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'new@example.com');
    fireEvent.changeText(getByPlaceholderText('At least 8 characters'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Re-enter your password'), 'password123');

    fireEvent.press(getByText('Create account'));

    await waitFor(() => {
      expect(mockedSignUp).toHaveBeenCalledWith('new@example.com', 'password123');
      expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
    });
  });

  it('submits forgot password form', async () => {
    mockedPasswordReset.mockResolvedValueOnce({ success: true });
    const { getByPlaceholderText, getByText } = render(<ForgotPasswordScreen />);

    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'user@example.com');
    fireEvent.press(getByText('Send reset link'));

    await waitFor(() => {
      expect(mockedPasswordReset).toHaveBeenCalledWith('user@example.com');
      expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
    });
  });
});
