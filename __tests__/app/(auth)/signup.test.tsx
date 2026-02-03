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
    useOptionalThemeContext: jest.fn(() => ({
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

  const Button = ({
    children,
    onPress,
    style,
    backgroundColor,
    color,
    borderColor,
    borderWidth,
    height,
    minWidth,
    paddingHorizontal,
    hoverStyle,
    pressStyle,
    disabledStyle,
    ...rest
  }: any) =>
    React.createElement(
      TouchableOpacity,
      {
        onPress,
        accessibilityRole: 'button',
        style: [
          {
            backgroundColor,
            color,
            borderColor,
            borderWidth,
            height,
            minWidth,
            paddingHorizontal,
          },
          style,
        ],
        hoverStyle,
        pressStyle,
        disabledStyle,
        __hoverStyle: hoverStyle,
        __pressStyle: pressStyle,
        __disabledStyle: disabledStyle,
        ...rest,
      },
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

import { getLocalName } from '@/auth/nameStorage';
import { signUpWithEmail } from '@/auth/service';
import { useFriendlyErrorHandler } from '@/errors/useFriendlyErrorHandler';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Platform } from 'react-native';
import { Separator, TamaguiProvider, Theme, useThemeName } from 'tamagui';
import SignUpScreen from '../../../app/(auth)/signup';
import { tamaguiConfig } from '../../../tamagui.config';

jest.mock('@/auth/service', () => ({
  signUpWithEmail: jest.fn(),
}));

const mockSignInWithOAuth = jest.fn();
let mockStatus = 'unauthenticated';

jest.mock('@/auth/session', () => ({
  useSessionStore: (selector: any) =>
    selector({
      signInWithOAuth: mockSignInWithOAuth,
      status: mockStatus,
    }),
}));

jest.mock('@/auth/nameStorage', () => ({
  getLocalName: jest.fn(),
}));

jest.mock('@/errors/useFriendlyErrorHandler', () => ({
  useFriendlyErrorHandler: jest.fn(),
}));

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
    back: mockBack,
  }),
  useNavigation: () => ({
    canGoBack: mockCanGoBack,
  }),
}));

const mockedSignUpWithEmail = signUpWithEmail as jest.MockedFunction<typeof signUpWithEmail>;
const mockedFriendlyError = useFriendlyErrorHandler as jest.MockedFunction<
  typeof useFriendlyErrorHandler
>;
const mockedGetLocalName = getLocalName as jest.MockedFunction<typeof getLocalName>;
const mockedUseThemeName = useThemeName as jest.MockedFunction<typeof useThemeName>;
const originalPlatform = Platform.OS;

// Helper to render components with Tamagui providers
const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <TamaguiProvider config={tamaguiConfig}>
      <Theme name="light">{component}</Theme>
    </TamaguiProvider>,
  );
};

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
    mockBack.mockClear();
    mockCanGoBack.mockReturnValue(true);
    mockSignInWithOAuth.mockClear();
    mockStatus = 'unauthenticated';
    mockedGetLocalName.mockReset();
    mockedSignUpWithEmail.mockClear();
    mockedUseThemeName.mockReturnValue('light');
    mockedFriendlyError.mockReturnValue(
      jest.fn(() => ({
        friendly: { code: 'unknown' as const, type: 'error' as const, titleKey: 'errors.signup' },
        toastId: 'toast-1',
      })),
    );
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalPlatform });
  });

  it('renders signup screen with all fields', () => {
    const { getByTestId } = renderWithProviders(<SignUpScreen />);

    expect(getByTestId('name-input')).toBeDefined();
    expect(getByTestId('email-input')).toBeDefined();
    expect(getByTestId('phone-input')).toBeDefined();
    expect(getByTestId('password-input')).toBeDefined();
    expect(getByTestId('confirm-password-input')).toBeDefined();
    expect(getByTestId('create-account-button')).toBeDefined();
    expect(getByTestId('sign-in-button')).toBeDefined();
  });

  it('prefills name when stored name exists', async () => {
    mockedGetLocalName.mockReturnValue('Stored Name');

    const { getByTestId } = renderWithProviders(<SignUpScreen />);

    await waitFor(() => {
      expect(getByTestId('name-input').props.value).toBe('Stored Name');
    });
  });

  it('navigates back when authenticated and navigation can go back', async () => {
    mockStatus = 'authenticated';
    mockCanGoBack.mockReturnValue(true);

    renderWithProviders(<SignUpScreen />);

    await waitFor(() => {
      expect(mockBack).toHaveBeenCalled();
    });
  });

  it('replaces with tabs when authenticated and navigation cannot go back', async () => {
    mockStatus = 'authenticated';
    mockCanGoBack.mockReturnValue(false);

    renderWithProviders(<SignUpScreen />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  it('shows friendly message when OAuth sign-in fails', async () => {
    const friendlyHandler = jest.fn(() => ({
      friendly: { code: 'unknown' as const, type: 'error' as const, description: 'OAuth failed' },
      toastId: 'toast-oauth',
    }));
    mockedFriendlyError.mockReturnValue(friendlyHandler);
    mockSignInWithOAuth.mockResolvedValue({
      success: false,
      error: 'OAuth error',
    });

    const { getByTestId, getByText } = renderWithProviders(<SignUpScreen />);

    fireEvent.press(getByTestId('oauth-google-button'));

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith('google');
      expect(getByText('OAuth failed')).toBeTruthy();
    });
  });

  it('clears the OAuth error message after a successful sign-in', async () => {
    const friendlyHandler = jest.fn(() => ({
      friendly: { code: 'unknown' as const, type: 'error' as const, description: 'OAuth failed' },
      toastId: 'toast-oauth',
    }));
    mockedFriendlyError.mockReturnValue(friendlyHandler);

    mockSignInWithOAuth.mockResolvedValueOnce({
      success: false,
      error: 'OAuth error',
    });
    mockSignInWithOAuth.mockResolvedValueOnce({
      success: true,
    });

    const { getByTestId, getByText } = renderWithProviders(<SignUpScreen />);

    fireEvent.press(getByTestId('oauth-google-button'));

    await waitFor(() => {
      expect(getByText('OAuth failed')).toBeTruthy();
    });

    fireEvent.press(getByTestId('oauth-google-button'));

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledTimes(2);
      expect(mockSignInWithOAuth).toHaveBeenNthCalledWith(2, 'google');
    });
  });

  it('renders Apple OAuth button on non-Android with light styles', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' });

    const { getByTestId } = renderWithProviders(<SignUpScreen />);
    const appleButton = getByTestId('oauth-apple-button');
    const appleStyle = Array.isArray(appleButton.props.style)
      ? Object.assign({}, ...appleButton.props.style)
      : appleButton.props.style;

    expect(appleStyle.backgroundColor).toBe('#FFFFFF');
    expect(appleStyle.borderColor).toBe('#747775');
    expect(appleStyle.color).toBe('#000000');
  });

  it('uses dark mode styles for Google OAuth button', () => {
    mockedUseThemeName.mockReturnValue('dark');

    const { getByTestId } = renderWithProviders(<SignUpScreen />);
    const googleButton = getByTestId('oauth-google-button');
    const googleStyle = Array.isArray(googleButton.props.style)
      ? Object.assign({}, ...googleButton.props.style)
      : googleButton.props.style;

    expect(googleStyle.backgroundColor).toBe('#131314');
    expect(googleStyle.borderColor).toBe('#8E918F');
    expect(googleStyle.color).toBe('#E3E3E3');
  });

  it('hides Apple OAuth button on Android', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android' });

    const { queryByTestId, getByTestId } = renderWithProviders(<SignUpScreen />);

    expect(queryByTestId('oauth-apple-button')).toBeNull();
    expect(getByTestId('oauth-google-button')).toBeDefined();
  });

  it('uses web spacing for the OAuth divider separator on web', () => {
    Object.defineProperty(Platform, 'OS', { value: 'web' });

    const { UNSAFE_getAllByType } = renderWithProviders(<SignUpScreen />);
    const separators = UNSAFE_getAllByType(Separator);
    const divider = separators.find((node) => node.props.marginTop !== undefined);

    expect(divider?.props.marginTop).toBe('$0');
  });

  it('disables submit button when email is empty', () => {
    const { getByTestId } = renderWithProviders(<SignUpScreen />);

    const nameInput = getByTestId('name-input');
    const passwordInput = getByTestId('password-input');
    const confirmPasswordInput = getByTestId('confirm-password-input');
    const submitButton = getByTestId('create-account-button');

    fireEvent.changeText(nameInput, 'Test User');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.changeText(confirmPasswordInput, 'password123');

    expect(submitButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('disables submit button when password is less than 8 characters', () => {
    const { getByTestId } = renderWithProviders(<SignUpScreen />);

    const nameInput = getByTestId('name-input');
    const emailInput = getByTestId('email-input');
    const passwordInput = getByTestId('password-input');
    const confirmPasswordInput = getByTestId('confirm-password-input');
    const submitButton = getByTestId('create-account-button');

    fireEvent.changeText(nameInput, 'Test User');
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'short');
    fireEvent.changeText(confirmPasswordInput, 'short');

    expect(submitButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('disables submit button when confirm password is less than 8 characters', () => {
    const { getByTestId } = renderWithProviders(<SignUpScreen />);

    const nameInput = getByTestId('name-input');
    const emailInput = getByTestId('email-input');
    const passwordInput = getByTestId('password-input');
    const confirmPasswordInput = getByTestId('confirm-password-input');
    const submitButton = getByTestId('create-account-button');

    fireEvent.changeText(nameInput, 'Test User');
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.changeText(confirmPasswordInput, 'short');

    expect(submitButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('enables submit button when all fields are valid', () => {
    const { getByTestId } = renderWithProviders(<SignUpScreen />);

    const nameInput = getByTestId('name-input');
    const emailInput = getByTestId('email-input');
    const passwordInput = getByTestId('password-input');
    const confirmPasswordInput = getByTestId('confirm-password-input');
    const submitButton = getByTestId('create-account-button');

    fireEvent.changeText(nameInput, 'Test User');
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.changeText(confirmPasswordInput, 'password123');

    expect(submitButton.props.accessibilityState?.disabled).toBe(false);
  });

  it('toggles password visibility when eye icon is pressed', () => {
    const { getByTestId } = renderWithProviders(<SignUpScreen />);

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
    const { getByTestId } = renderWithProviders(<SignUpScreen />);

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
    const { getByTestId } = renderWithProviders(<SignUpScreen />);

    const nameInput = getByTestId('name-input');
    const emailInput = getByTestId('email-input');
    const passwordInput = getByTestId('password-input');
    const confirmPasswordInput = getByTestId('confirm-password-input');
    const submitButton = getByTestId('create-account-button');

    fireEvent.changeText(nameInput, 'Test User');
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.changeText(confirmPasswordInput, 'different456');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockedSignUpWithEmail).not.toHaveBeenCalled();
    });
  });

  it('shows error when name is missing on submit', async () => {
    const { getByTestId, getByText } = renderWithProviders(<SignUpScreen />);

    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.changeText(getByTestId('confirm-password-input'), 'password123');

    fireEvent(getByTestId('confirm-password-input'), 'submitEditing');

    await waitFor(() => {
      expect(getByText('auth.signup.missingNameDescription')).toBeTruthy();
    });
  });

  it('shows email validation error on blur', async () => {
    const { getByTestId, getByText } = renderWithProviders(<SignUpScreen />);

    fireEvent.changeText(getByTestId('name-input'), 'Test User');
    fireEvent.changeText(getByTestId('email-input'), 'not-an-email');
    fireEvent(getByTestId('email-input'), 'blur');

    await waitFor(() => {
      expect(getByText('auth.signup.invalidEmailDescription')).toBeTruthy();
    });
  });

  it('clears email validation error when corrected', async () => {
    const { getByTestId, queryByText } = renderWithProviders(<SignUpScreen />);

    const emailInput = getByTestId('email-input');

    fireEvent.changeText(emailInput, 'not-an-email');
    fireEvent(emailInput, 'blur');

    await waitFor(() => {
      expect(queryByText('auth.signup.invalidEmailDescription')).toBeTruthy();
    });

    fireEvent.changeText(emailInput, 'valid@example.com');

    await waitFor(() => {
      expect(queryByText('auth.signup.invalidEmailDescription')).toBeNull();
    });
  });

  it('validates email on submit when email is invalid', async () => {
    const { getByTestId, getByText } = renderWithProviders(<SignUpScreen />);

    fireEvent.changeText(getByTestId('name-input'), 'Test User');
    fireEvent.changeText(getByTestId('email-input'), 'bad-email');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.changeText(getByTestId('confirm-password-input'), 'password123');

    fireEvent(getByTestId('confirm-password-input'), 'submitEditing');

    await waitFor(() => {
      expect(getByText('auth.signup.invalidEmailDescription')).toBeTruthy();
      expect(mockedSignUpWithEmail).not.toHaveBeenCalled();
    });
  });

  it('rejects invalid phone number on submit', async () => {
    const { getByTestId, getByText } = renderWithProviders(<SignUpScreen />);

    fireEvent.changeText(getByTestId('name-input'), 'Test User');
    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('phone-input'), '123');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.changeText(getByTestId('confirm-password-input'), 'password123');
    fireEvent.press(getByTestId('create-account-button'));

    await waitFor(() => {
      expect(mockedSignUpWithEmail).not.toHaveBeenCalled();
      expect(getByText('auth.signup.phoneInvalidDescription')).toBeTruthy();
    });
  });

  it('clears phone input when only non-digit characters are entered', () => {
    const { getByTestId } = renderWithProviders(<SignUpScreen />);

    fireEvent.changeText(getByTestId('phone-input'), '---');

    expect(getByTestId('phone-input').props.value).toBe('');
  });

  it('validates phone number when touched', async () => {
    const { getByTestId, queryByText } = renderWithProviders(<SignUpScreen />);

    const phoneInput = getByTestId('phone-input');

    fireEvent.changeText(phoneInput, '123');
    fireEvent(phoneInput, 'blur');

    await waitFor(() => {
      expect(queryByText('auth.signup.phoneInvalidDescription')).toBeTruthy();
    });

    fireEvent.changeText(phoneInput, '4155552671');

    await waitFor(() => {
      expect(queryByText('auth.signup.phoneInvalidDescription')).toBeNull();
    });
  });

  it('formats international phone numbers with a + prefix', () => {
    const { getByTestId } = renderWithProviders(<SignUpScreen />);

    fireEvent.changeText(getByTestId('phone-input'), '+14155552671');

    expect(getByTestId('phone-input').props.value).toContain('+1');
  });

  it('sets phone error when touched and invalid input is entered', async () => {
    const { getByTestId, queryByText } = renderWithProviders(<SignUpScreen />);

    const phoneInput = getByTestId('phone-input');

    fireEvent(phoneInput, 'blur');
    fireEvent.changeText(phoneInput, '415555267');

    await waitFor(() => {
      expect(queryByText('auth.signup.phoneInvalidDescription')).toBeTruthy();
    });
  });

  it('sets phone error when blurring an invalid number', async () => {
    const { getByTestId, queryByText } = renderWithProviders(<SignUpScreen />);

    const phoneInput = getByTestId('phone-input');

    fireEvent.changeText(phoneInput, '+1415555267');
    fireEvent(phoneInput, 'blur');

    await waitFor(() => {
      expect(queryByText('auth.signup.phoneInvalidDescription')).toBeTruthy();
    });
  });

  it('clears phone error when touched and input is emptied', async () => {
    const { getByTestId, queryByText } = renderWithProviders(<SignUpScreen />);

    const phoneInput = getByTestId('phone-input');

    fireEvent.changeText(phoneInput, '123');
    fireEvent(phoneInput, 'blur');

    await waitFor(() => {
      expect(queryByText('auth.signup.phoneInvalidDescription')).toBeTruthy();
    });

    fireEvent.changeText(phoneInput, '');

    await waitFor(() => {
      expect(queryByText('auth.signup.phoneInvalidDescription')).toBeNull();
    });
  });

  it('keeps phone error clear when blurring an empty field', async () => {
    const { getByTestId, queryByText } = renderWithProviders(<SignUpScreen />);

    fireEvent(getByTestId('phone-input'), 'blur');

    await waitFor(() => {
      expect(queryByText('auth.signup.phoneInvalidDescription')).toBeNull();
    });
  });

  it('submits normalized phone number metadata', async () => {
    mockedSignUpWithEmail.mockResolvedValue({ success: true });
    const { getByTestId } = renderWithProviders(<SignUpScreen />);

    fireEvent.changeText(getByTestId('name-input'), 'Test User');
    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('phone-input'), '4155552671');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.changeText(getByTestId('confirm-password-input'), 'password123');
    fireEvent.press(getByTestId('create-account-button'));

    await waitFor(() => {
      expect(mockedSignUpWithEmail).toHaveBeenCalledWith('test@example.com', 'password123', {
        fullName: 'Test User',
        phoneNumber: '+14155552671',
      });
    });
  });

  it('submits normalized phone number when provided in + format', async () => {
    mockedSignUpWithEmail.mockResolvedValue({ success: true });
    const { getByTestId } = renderWithProviders(<SignUpScreen />);

    fireEvent.changeText(getByTestId('name-input'), 'Test User');
    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('phone-input'), '+14155552671');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.changeText(getByTestId('confirm-password-input'), 'password123');
    fireEvent.press(getByTestId('create-account-button'));

    await waitFor(() => {
      expect(mockedSignUpWithEmail).toHaveBeenCalledWith('test@example.com', 'password123', {
        fullName: 'Test User',
        phoneNumber: '+14155552671',
      });
    });
  });

  it('allows deleting phone input without reformatting', () => {
    const { getByTestId } = renderWithProviders(<SignUpScreen />);

    fireEvent.changeText(getByTestId('phone-input'), '4155552671');
    const formatted = getByTestId('phone-input').props.value as string;
    expect(formatted).toContain('415');

    fireEvent.changeText(getByTestId('phone-input'), '415');
    expect(getByTestId('phone-input').props.value).toBe('415');
  });

  it('shows missing description error when password requirements are unmet', async () => {
    const { getByTestId, getByText } = renderWithProviders(<SignUpScreen />);

    fireEvent.changeText(getByTestId('name-input'), 'Test User');
    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'short');
    fireEvent.changeText(getByTestId('confirm-password-input'), 'short');

    fireEvent(getByTestId('confirm-password-input'), 'submitEditing');

    await waitFor(() => {
      expect(getByText('auth.signup.missingDescription')).toBeTruthy();
    });
  });

  it('advances focus across fields on submit editing', () => {
    const { getByTestId } = renderWithProviders(<SignUpScreen />);

    fireEvent(getByTestId('name-input'), 'submitEditing');
    fireEvent(getByTestId('email-input'), 'submitEditing');
    fireEvent(getByTestId('phone-input'), 'submitEditing');
    fireEvent(getByTestId('password-input'), 'submitEditing');
  });

  it('shows error toast when submitting with invalid form', async () => {
    const { getByTestId } = renderWithProviders(<SignUpScreen />);

    const submitButton = getByTestId('create-account-button');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockedSignUpWithEmail).not.toHaveBeenCalled();
    });
  });

  it('calls signUpWithEmail and navigates on success', async () => {
    mockedSignUpWithEmail.mockResolvedValue({ success: true });

    const { getByTestId } = renderWithProviders(<SignUpScreen />);

    const nameInput = getByTestId('name-input');
    const emailInput = getByTestId('email-input');
    const passwordInput = getByTestId('password-input');
    const confirmPasswordInput = getByTestId('confirm-password-input');
    const submitButton = getByTestId('create-account-button');

    fireEvent.changeText(nameInput, 'Test User');
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.changeText(confirmPasswordInput, 'password123');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockedSignUpWithEmail).toHaveBeenCalledWith('test@example.com', 'password123', {
        fullName: 'Test User',
        phoneNumber: undefined,
      });
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

    const { getByTestId } = renderWithProviders(<SignUpScreen />);

    const nameInput = getByTestId('name-input');
    const emailInput = getByTestId('email-input');
    const passwordInput = getByTestId('password-input');
    const confirmPasswordInput = getByTestId('confirm-password-input');
    const submitButton = getByTestId('create-account-button');

    fireEvent.changeText(nameInput, 'Test User');
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.changeText(confirmPasswordInput, 'password123');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockedSignUpWithEmail).toHaveBeenCalledWith('test@example.com', 'password123', {
        fullName: 'Test User',
        phoneNumber: undefined,
      });
    });

    await waitFor(() => {
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  it('falls back to friendly title key when no description is provided', async () => {
    mockedFriendlyError.mockReturnValue(
      jest.fn(() => ({
        friendly: { code: 'unknown' as const, type: 'error' as const, titleKey: 'errors.signup' },
        toastId: 'toast-3',
      })),
    );
    mockedSignUpWithEmail.mockResolvedValue({
      success: false,
      error: 'Signup failed',
    });

    const { getByTestId, getByText } = renderWithProviders(<SignUpScreen />);

    fireEvent.changeText(getByTestId('name-input'), 'Test User');
    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.changeText(getByTestId('confirm-password-input'), 'password123');
    fireEvent.press(getByTestId('create-account-button'));

    await waitFor(() => {
      expect(getByText('errors.signup')).toBeTruthy();
    });
  });

  it('uses friendly description when provided', async () => {
    mockedFriendlyError.mockReturnValue(
      jest.fn(() => ({
        friendly: {
          code: 'unknown' as const,
          type: 'error' as const,
          description: 'Friendly description',
        },
        toastId: 'toast-4',
      })),
    );
    mockedSignUpWithEmail.mockResolvedValue({
      success: false,
      error: 'Signup failed',
    });

    const { getByTestId, getByText } = renderWithProviders(<SignUpScreen />);

    fireEvent.changeText(getByTestId('name-input'), 'Test User');
    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.changeText(getByTestId('confirm-password-input'), 'password123');
    fireEvent.press(getByTestId('create-account-button'));

    await waitFor(() => {
      expect(getByText('Friendly description')).toBeTruthy();
    });
  });

  it('uses friendly description key when provided', async () => {
    mockedFriendlyError.mockReturnValue(
      jest.fn(() => ({
        friendly: {
          code: 'unknown' as const,
          type: 'error' as const,
          descriptionKey: 'errors.signup.description',
        },
        toastId: 'toast-5',
      })),
    );
    mockedSignUpWithEmail.mockResolvedValue({
      success: false,
      error: 'Signup failed',
    });

    const { getByTestId, getByText } = renderWithProviders(<SignUpScreen />);

    fireEvent.changeText(getByTestId('name-input'), 'Test User');
    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.changeText(getByTestId('confirm-password-input'), 'password123');
    fireEvent.press(getByTestId('create-account-button'));

    await waitFor(() => {
      expect(getByText('errors.signup.description')).toBeTruthy();
    });
  });

  it('falls back to error message string when friendly data is missing', async () => {
    mockedFriendlyError.mockReturnValue(
      jest.fn(() => ({
        friendly: { code: 'unknown' as const, type: 'error' as const },
        toastId: 'toast-6',
      })),
    );
    mockedSignUpWithEmail.mockResolvedValue({
      success: false,
      error: 'Signup failed',
    });

    const { getByTestId, getByText } = renderWithProviders(<SignUpScreen />);

    fireEvent.changeText(getByTestId('name-input'), 'Test User');
    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.changeText(getByTestId('confirm-password-input'), 'password123');
    fireEvent.press(getByTestId('create-account-button'));

    await waitFor(() => {
      expect(getByText('Signup failed')).toBeTruthy();
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

    const { getByTestId } = renderWithProviders(<SignUpScreen />);

    fireEvent.changeText(getByTestId('name-input'), 'Test User');
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

    const { getByTestId } = renderWithProviders(<SignUpScreen />);

    const nameInput = getByTestId('name-input');
    const emailInput = getByTestId('email-input');
    const passwordInput = getByTestId('password-input');
    const confirmPasswordInput = getByTestId('confirm-password-input');
    const submitButton = getByTestId('create-account-button');

    fireEvent.changeText(nameInput, 'Test User');
    fireEvent.changeText(emailInput, '  test@example.com  ');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.changeText(confirmPasswordInput, 'password123');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockedSignUpWithEmail).toHaveBeenCalledWith('test@example.com', 'password123', {
        fullName: 'Test User',
        phoneNumber: undefined,
      });
    });
  });

  it('navigates to login when sign in button is pressed', () => {
    const { getByTestId } = renderWithProviders(<SignUpScreen />);

    const signInButton = getByTestId('sign-in-button');
    fireEvent.press(signInButton);

    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
  });

  it('disables submit button while submitting', async () => {
    mockedSignUpWithEmail.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100)),
    );

    const { getByTestId } = renderWithProviders(<SignUpScreen />);

    const nameInput = getByTestId('name-input');
    const emailInput = getByTestId('email-input');
    const passwordInput = getByTestId('password-input');
    const confirmPasswordInput = getByTestId('confirm-password-input');
    const submitButton = getByTestId('create-account-button');

    fireEvent.changeText(nameInput, 'Test User');
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

  it('normalizes phone with non-parseable number fallback', async () => {
    mockedSignUpWithEmail.mockResolvedValue({ success: true });
    const { getByTestId } = renderWithProviders(<SignUpScreen />);

    fireEvent.changeText(getByTestId('name-input'), 'Test User');
    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    // Enter a phone that is somewhat valid for formatting but might have edge cases
    fireEvent.changeText(getByTestId('phone-input'), '123');
    // Make it valid so form can be submitted
    fireEvent.changeText(getByTestId('phone-input'), '4155552671');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.changeText(getByTestId('confirm-password-input'), 'password123');
    fireEvent.press(getByTestId('create-account-button'));

    await waitFor(() => {
      expect(mockedSignUpWithEmail).toHaveBeenCalled();
    });
  });

  it('handles signup failure without error message or friendly error', async () => {
    mockedFriendlyError.mockReturnValue(
      jest.fn(() => ({
        friendly: { code: 'unknown' as const, type: 'error' as const },
        toastId: 'toast-10',
      })) as any,
    );
    mockedSignUpWithEmail.mockResolvedValue({
      success: false,
    });

    const { getByTestId, getByText } = renderWithProviders(<SignUpScreen />);

    fireEvent.changeText(getByTestId('name-input'), 'Test User');
    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.changeText(getByTestId('confirm-password-input'), 'password123');
    fireEvent.press(getByTestId('create-account-button'));

    await waitFor(() => {
      expect(mockedSignUpWithEmail).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(getByText('auth.signup.errorUnknown')).toBeTruthy();
    });
  });

  it('sets valid phone error on blur when phone is valid', async () => {
    const { getByTestId, queryByText } = renderWithProviders(<SignUpScreen />);

    const phoneInput = getByTestId('phone-input');

    fireEvent.changeText(phoneInput, '4155552671');
    fireEvent(phoneInput, 'blur');

    await waitFor(() => {
      expect(queryByText('auth.signup.phoneInvalidDescription')).toBeNull();
    });
  });

  it('uses friendly title when no descriptionKey or description provided', async () => {
    mockedFriendlyError.mockReturnValue(
      jest.fn(() => ({
        friendly: {
          code: 'unknown' as const,
          type: 'error' as const,
          title: 'Friendly Title',
        },
        toastId: 'toast-7',
      })),
    );
    mockedSignUpWithEmail.mockResolvedValue({
      success: false,
      error: 'Signup failed',
    });

    const { getByTestId, getByText } = renderWithProviders(<SignUpScreen />);

    fireEvent.changeText(getByTestId('name-input'), 'Test User');
    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.changeText(getByTestId('confirm-password-input'), 'password123');
    fireEvent.press(getByTestId('create-account-button'));

    await waitFor(() => {
      expect(getByText('Friendly Title')).toBeTruthy();
    });
  });

  it('submits with non-parseable phone in metadata', async () => {
    mockedSignUpWithEmail.mockResolvedValue({ success: true });
    const { getByTestId } = renderWithProviders(<SignUpScreen />);

    fireEvent.changeText(getByTestId('name-input'), 'Test User');
    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    // Enter characters that get stripped leaving empty string
    fireEvent.changeText(getByTestId('phone-input'), '   ');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.changeText(getByTestId('confirm-password-input'), 'password123');
    fireEvent.press(getByTestId('create-account-button'));

    await waitFor(() => {
      expect(mockedSignUpWithEmail).toHaveBeenCalledWith('test@example.com', 'password123', {
        fullName: 'Test User',
        phoneNumber: undefined,
      });
    });
  });

  it('submits with invalid phone that cannot be parsed to E164', async () => {
    mockedSignUpWithEmail.mockResolvedValue({ success: true });
    const { getByTestId } = renderWithProviders(<SignUpScreen />);

    fireEvent.changeText(getByTestId('name-input'), 'Test User');
    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    // Enter an invalid phone format that libphonenumber cannot parse
    fireEvent.changeText(getByTestId('phone-input'), '1');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.changeText(getByTestId('confirm-password-input'), 'password123');
    fireEvent.press(getByTestId('create-account-button'));

    await waitFor(() => {
      // Should be rejected due to invalid phone
      expect(mockedSignUpWithEmail).not.toHaveBeenCalled();
    });
  });

  it('uses description when provided as empty string (truthy for nullish coalescing)', async () => {
    mockedFriendlyError.mockReturnValue(
      jest.fn(() => ({
        friendly: {
          code: 'unknown' as const,
          type: 'error' as const,
          description: '',
          titleKey: 'errors.signup.fallback',
        },
        toastId: 'toast-8',
      })),
    );
    mockedSignUpWithEmail.mockResolvedValue({
      success: false,
      error: 'Signup failed',
    });

    const { getByTestId, queryByText } = renderWithProviders(<SignUpScreen />);

    fireEvent.changeText(getByTestId('name-input'), 'Test User');
    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.changeText(getByTestId('confirm-password-input'), 'password123');
    fireEvent.press(getByTestId('create-account-button'));

    await waitFor(() => {
      // Empty string is truthy for ??, so it should be used (InlineError shows empty)
      // The titleKey should NOT be used
      expect(queryByText('errors.signup.fallback')).toBeNull();
    });
  });

  it('uses descriptionKey fallback when description is null', async () => {
    mockedFriendlyError.mockReturnValue(
      jest.fn(() => ({
        friendly: {
          code: 'unknown' as const,
          type: 'error' as const,
          description: null as any,
          descriptionKey: 'errors.signup.descriptionKey',
        },
        toastId: 'toast-9',
      })),
    );
    mockedSignUpWithEmail.mockResolvedValue({
      success: false,
      error: 'Signup failed',
    });

    const { getByTestId, getByText } = renderWithProviders(<SignUpScreen />);

    fireEvent.changeText(getByTestId('name-input'), 'Test User');
    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.changeText(getByTestId('confirm-password-input'), 'password123');
    fireEvent.press(getByTestId('create-account-button'));

    await waitFor(() => {
      expect(getByText('errors.signup.descriptionKey')).toBeTruthy();
    });
  });

  it('submits with phone containing only formatting characters', async () => {
    mockedSignUpWithEmail.mockResolvedValue({ success: true });
    const { getByTestId } = renderWithProviders(<SignUpScreen />);

    fireEvent.changeText(getByTestId('name-input'), 'Test User');
    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    // Phone with only formatting chars - should be normalized to empty
    fireEvent.changeText(getByTestId('phone-input'), '()-');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.changeText(getByTestId('confirm-password-input'), 'password123');
    fireEvent.press(getByTestId('create-account-button'));

    await waitFor(() => {
      expect(mockedSignUpWithEmail).toHaveBeenCalledWith('test@example.com', 'password123', {
        fullName: 'Test User',
        phoneNumber: undefined,
      });
    });
  });
});
