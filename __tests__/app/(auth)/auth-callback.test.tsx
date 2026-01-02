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
    useThemeName: jest.fn(() => 'light'),
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', resolvedLanguage: 'en', languages: ['en'] },
  }),
}));

import { supabase } from '@/auth/client';
import { useFriendlyErrorHandler } from '@/errors/useFriendlyErrorHandler';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import React from 'react';
import AuthCallbackScreen from '../../../app/(auth)/auth-callback';

jest.mock('@/auth/client', () => ({
  supabase: {
    auth: {
      setSession: jest.fn(),
      exchangeCodeForSession: jest.fn(),
    },
  },
}));

jest.mock('@/errors/useFriendlyErrorHandler', () => ({
  useFriendlyErrorHandler: jest.fn(),
}));

jest.mock('expo-linking', () => ({
  createURL: jest.fn(),
}));

const mockReplace = jest.fn();
const mockUseLocalSearchParams = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}));

const mockedSetSession = supabase.auth.setSession as jest.MockedFunction<
  typeof supabase.auth.setSession
>;
const mockedExchangeCodeForSession = supabase.auth.exchangeCodeForSession as jest.MockedFunction<
  typeof supabase.auth.exchangeCodeForSession
>;
const mockedFriendlyError = useFriendlyErrorHandler as jest.MockedFunction<
  typeof useFriendlyErrorHandler
>;
const mockedCreateURL = Linking.createURL as jest.MockedFunction<typeof Linking.createURL>;

// Suppress act() warnings
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

describe('AuthCallbackScreen - Native', () => {
  const originalOS = Platform.OS;

  beforeAll(() => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
  });

  afterAll(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS, writable: true });
  });

  beforeEach(() => {
    mockReplace.mockClear();
    mockedSetSession.mockClear();
    mockedExchangeCodeForSession.mockClear();
    mockedCreateURL.mockClear();
    mockUseLocalSearchParams.mockReturnValue({});
    // Default mock for exchangeCodeForSession
    mockedExchangeCodeForSession.mockResolvedValue({ data: { session: {} }, error: null } as any);
    mockedFriendlyError.mockReturnValue(
      jest.fn(() => ({
        toastId: 'toast-1',
        friendly: {
          code: 'unknown' as const,
          type: 'error' as const,
          titleKey: 'errors.unknown.description',
        },
      })),
    );
  });

  it('renders signing in message', () => {
    mockUseLocalSearchParams.mockReturnValue({ code: 'auth-code-123' });
    const { getByText } = render(<AuthCallbackScreen />);
    expect(getByText('auth.signingIn')).toBeTruthy();
  });

  it('exchanges code for session on native with valid code', async () => {
    mockUseLocalSearchParams.mockReturnValue({ code: 'auth-code-123' });
    mockedCreateURL.mockReturnValue('betterhabits://auth-callback?code=auth-code-123');
    mockedExchangeCodeForSession.mockResolvedValue({ data: { session: {} }, error: null } as any);

    render(<AuthCallbackScreen />);

    await waitFor(() => {
      expect(mockedCreateURL).toHaveBeenCalledWith('auth-callback', {
        queryParams: { code: 'auth-code-123' },
      });
      expect(mockedExchangeCodeForSession).toHaveBeenCalledWith(
        'betterhabits://auth-callback?code=auth-code-123',
      );
    });
  });

  it('navigates to tabs after successful code exchange', async () => {
    mockUseLocalSearchParams.mockReturnValue({ code: 'auth-code-123' });
    mockedCreateURL.mockReturnValue('betterhabits://auth-callback?code=auth-code-123');
    mockedExchangeCodeForSession.mockResolvedValue({ data: { session: {} }, error: null } as any);

    render(<AuthCallbackScreen />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  it('shows error when code is missing', async () => {
    mockUseLocalSearchParams.mockReturnValue({});
    const handleError = jest.fn(() => ({
      toastId: 'toast-1',
      friendly: {
        code: 'auth.oauth.browser' as const,
        type: 'error' as const,
        titleKey: 'errors.auth.oauthBrowser.title',
        descriptionKey: 'errors.auth.oauthBrowser.description',
      },
    }));
    mockedFriendlyError.mockReturnValue(handleError);

    const { getByTestId } = render(<AuthCallbackScreen />);

    await waitFor(() => {
      expect(handleError).toHaveBeenCalledWith(
        {
          code: 'auth.oauth.browser',
          titleKey: 'errors.auth.oauthBrowser.title',
          descriptionKey: 'errors.auth.oauthBrowser.description',
          type: 'error',
        },
        { surface: 'auth.callback', suppressToast: true },
      );
    });

    const errorElement = getByTestId('auth-callback-error');
    expect(errorElement).toBeTruthy();
  });

  it('shows error when code exchange fails', async () => {
    mockUseLocalSearchParams.mockReturnValue({ code: 'auth-code-123' });
    mockedCreateURL.mockReturnValue('betterhabits://auth-callback?code=auth-code-123');
    const authError = { message: 'Invalid code', status: 400 };
    mockedExchangeCodeForSession.mockResolvedValue({ data: null, error: authError } as any);

    const handleError = jest.fn(() => ({
      toastId: 'toast-1',
      friendly: {
        code: 'auth.oauth.redirect' as const,
        type: 'error' as const,
        titleKey: 'errors.auth.invalidCode.title',
        description: 'The authorization code is invalid or has expired',
      },
    }));
    mockedFriendlyError.mockReturnValue(handleError);

    const { getByTestId } = render(<AuthCallbackScreen />);

    await waitFor(() => {
      expect(handleError).toHaveBeenCalledWith(authError, {
        surface: 'auth.callback',
        suppressToast: true,
      });
    });

    const errorElement = getByTestId('auth-callback-error');
    expect(errorElement).toBeTruthy();
  });

  it('shows retry button when error occurs', async () => {
    mockUseLocalSearchParams.mockReturnValue({});
    const handleError = jest.fn(() => ({
      toastId: 'toast-1',
      friendly: {
        code: 'auth.oauth.browser' as const,
        type: 'error' as const,
        titleKey: 'errors.auth.oauthBrowser.title',
        descriptionKey: 'errors.auth.oauthBrowser.description',
      },
    }));
    mockedFriendlyError.mockReturnValue(handleError);

    const { getByTestId } = render(<AuthCallbackScreen />);

    await waitFor(() => {
      const retryButton = getByTestId('auth-callback-sign-in');
      expect(retryButton).toBeTruthy();
    });
  });

  it('navigates to login when retry button is pressed', async () => {
    mockUseLocalSearchParams.mockReturnValue({});
    const handleError = jest.fn(() => ({
      toastId: 'toast-1',
      friendly: {
        code: 'auth.oauth.browser' as const,
        type: 'error' as const,
        descriptionKey: 'errors.auth.oauthBrowser.description',
      },
    }));
    mockedFriendlyError.mockReturnValue(handleError);

    const { getByTestId } = render(<AuthCallbackScreen />);

    await waitFor(() => {
      const retryButton = getByTestId('auth-callback-sign-in');
      fireEvent.press(retryButton);
    });

    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
  });

  it('processes callback only once with duplicate renders', async () => {
    mockUseLocalSearchParams.mockReturnValue({ code: 'auth-code-123' });
    mockedCreateURL.mockReturnValue('betterhabits://auth-callback?code=auth-code-123');
    mockedExchangeCodeForSession.mockResolvedValue({ data: { session: {} }, error: null } as any);

    const { rerender } = render(<AuthCallbackScreen />);
    rerender(<AuthCallbackScreen />);
    rerender(<AuthCallbackScreen />);

    await waitFor(() => {
      expect(mockedExchangeCodeForSession).toHaveBeenCalledTimes(1);
    });
  });

  it('handles array values in query params', async () => {
    mockUseLocalSearchParams.mockReturnValue({ code: ['auth-code-123', 'extra'] });
    mockedCreateURL.mockReturnValue('betterhabits://auth-callback?code=auth-code-123');
    mockedExchangeCodeForSession.mockResolvedValue({ data: { session: {} }, error: null } as any);

    render(<AuthCallbackScreen />);

    await waitFor(() => {
      expect(mockedCreateURL).toHaveBeenCalledWith('auth-callback', {
        queryParams: { code: 'auth-code-123' },
      });
    });
  });
});

describe('AuthCallbackScreen - Web', () => {
  const originalOS = Platform.OS;
  let originalWindow: any;
  let mockWindowLocation: any;
  let mockWindowHistory: any;

  beforeAll(() => {
    Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });

    // Save original window
    originalWindow = global.window;

    // Create mock window location and history
    mockWindowLocation = {
      hash: '',
      pathname: '/auth-callback',
      search: '',
      assign: jest.fn(),
      replace: jest.fn(),
    };

    mockWindowHistory = {
      replaceState: jest.fn(),
    };

    Object.defineProperty(global, 'window', {
      value: {
        location: mockWindowLocation,
        history: mockWindowHistory,
      },
      writable: true,
      configurable: true,
    });
  });

  afterAll(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS, writable: true });
    Object.defineProperty(global, 'window', {
      value: originalWindow,
      writable: true,
      configurable: true,
    });
  });

  beforeEach(() => {
    mockReplace.mockClear();
    mockedSetSession.mockClear();
    mockedExchangeCodeForSession.mockClear();
    mockUseLocalSearchParams.mockReturnValue({});
    mockWindowLocation.hash = '';
    mockWindowLocation.replace.mockClear();
    mockWindowHistory.replaceState.mockClear();
    // Default mock for setSession
    mockedSetSession.mockResolvedValue({ data: { session: {} }, error: null } as any);
    mockedFriendlyError.mockReturnValue(
      jest.fn(() => ({
        toastId: 'toast-1',
        friendly: {
          code: 'unknown' as const,
          type: 'error' as const,
          titleKey: 'errors.unknown.description',
        },
      })),
    );
  });

  it('extracts tokens from URL hash and sets session on web', async () => {
    mockWindowLocation.hash = '#access_token=token123&refresh_token=refresh456';
    mockedSetSession.mockResolvedValue({ data: { session: {} }, error: null } as any);

    render(<AuthCallbackScreen />);

    await waitFor(() => {
      expect(mockedSetSession).toHaveBeenCalledWith({
        access_token: 'token123',
        refresh_token: 'refresh456',
      });
    });
  });

  it('clears URL hash after extraction on web', async () => {
    mockWindowLocation.hash = '#access_token=token123&refresh_token=refresh456';
    mockedSetSession.mockResolvedValue({ data: { session: {} }, error: null } as any);

    render(<AuthCallbackScreen />);

    await waitFor(() => {
      expect(mockWindowHistory.replaceState).toHaveBeenCalledWith(null, '', '/auth-callback');
    });
  });

  it('redirects to home after successful session on web', async () => {
    mockWindowLocation.hash = '#access_token=token123&refresh_token=refresh456';
    mockedSetSession.mockResolvedValue({ data: { session: {} }, error: null } as any);

    render(<AuthCallbackScreen />);

    await waitFor(() => {
      expect(mockWindowLocation.replace).toHaveBeenCalledWith('/');
    });
  });

  it('shows error when tokens are missing from hash on web', async () => {
    mockWindowLocation.hash = '';
    const handleError = jest.fn(() => ({
      toastId: 'toast-1',
      friendly: {
        code: 'auth.oauth.browser' as const,
        type: 'error' as const,
        descriptionKey: 'errors.auth.oauthBrowser.description',
      },
    }));
    mockedFriendlyError.mockReturnValue(handleError);

    const { getByTestId } = render(<AuthCallbackScreen />);

    await waitFor(() => {
      expect(handleError).toHaveBeenCalledWith(
        {
          code: 'auth.oauth.browser',
          titleKey: 'errors.auth.oauthBrowser.title',
          descriptionKey: 'errors.auth.oauthBrowser.description',
          type: 'error',
        },
        { surface: 'auth.callback', suppressToast: true },
      );
    });

    const errorElement = getByTestId('auth-callback-error');
    expect(errorElement).toBeTruthy();
  });

  it('shows error when only access_token is present on web', async () => {
    mockWindowLocation.hash = '#access_token=token123';
    const handleError = jest.fn(() => ({
      toastId: 'toast-1',
      friendly: {
        code: 'auth.oauth.browser' as const,
        type: 'error' as const,
        descriptionKey: 'errors.auth.oauthBrowser.description',
      },
    }));
    mockedFriendlyError.mockReturnValue(handleError);

    render(<AuthCallbackScreen />);

    await waitFor(() => {
      expect(handleError).toHaveBeenCalled();
      expect(mockedSetSession).not.toHaveBeenCalled();
    });
  });

  it('shows error when setSession fails on web', async () => {
    mockWindowLocation.hash = '#access_token=token123&refresh_token=refresh456';
    const authError = { message: 'Session creation failed', status: 400 };
    mockedSetSession.mockResolvedValue({ data: null, error: authError } as any);

    const handleError = jest.fn(() => ({
      toastId: 'toast-1',
      friendly: {
        code: 'auth.invalid-credentials' as const,
        type: 'error' as const,
        description: 'Failed to create session',
      },
    }));
    mockedFriendlyError.mockReturnValue(handleError);

    const { getByTestId } = render(<AuthCallbackScreen />);

    await waitFor(() => {
      expect(handleError).toHaveBeenCalledWith(authError, {
        surface: 'auth.callback',
        suppressToast: true,
      });
    });

    const errorElement = getByTestId('auth-callback-error');
    expect(errorElement).toBeTruthy();
    expect(mockWindowLocation.replace).not.toHaveBeenCalled();
  });

  it('processes web callback only once with duplicate renders', async () => {
    mockWindowLocation.hash = '#access_token=token123&refresh_token=refresh456';
    mockedSetSession.mockResolvedValue({ data: { session: {} }, error: null } as any);

    const { rerender } = render(<AuthCallbackScreen />);
    rerender(<AuthCallbackScreen />);
    rerender(<AuthCallbackScreen />);

    await waitFor(() => {
      expect(mockedSetSession).toHaveBeenCalledTimes(1);
    });
  });
});

describe('AuthCallbackScreen - Error Message Display', () => {
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
    mockReplace.mockClear();
    mockUseLocalSearchParams.mockReturnValue({});
  });

  it('displays error description when available', async () => {
    const handleError = jest.fn(() => ({
      toastId: 'toast-1',
      friendly: {
        code: 'auth.oauth.browser' as const,
        type: 'error' as const,
        description: 'Custom error description',
      },
    }));
    mockedFriendlyError.mockReturnValue(handleError);

    render(<AuthCallbackScreen />);

    await waitFor(() => {
      expect(handleError).toHaveBeenCalled();
    });
  });

  it('falls back to translated description key when description is not available', async () => {
    const handleError = jest.fn(() => ({
      toastId: 'toast-1',
      friendly: {
        code: 'auth.oauth.browser' as const,
        type: 'error' as const,
        descriptionKey: 'errors.auth.oauthBrowser.description',
      },
    }));
    mockedFriendlyError.mockReturnValue(handleError);

    render(<AuthCallbackScreen />);

    await waitFor(() => {
      expect(handleError).toHaveBeenCalled();
    });
  });

  it('falls back to title when description is not available', async () => {
    const handleError = jest.fn(() => ({
      toastId: 'toast-1',
      friendly: {
        code: 'auth.oauth.browser' as const,
        type: 'error' as const,
        title: 'Authentication Error',
      },
    }));
    mockedFriendlyError.mockReturnValue(handleError);

    render(<AuthCallbackScreen />);

    await waitFor(() => {
      expect(handleError).toHaveBeenCalled();
    });
  });

  it('uses unknown error message as final fallback', async () => {
    const handleError = jest.fn(() => ({
      toastId: 'toast-1',
      friendly: {
        code: 'unknown' as const,
        type: 'error' as const,
      },
    }));
    mockedFriendlyError.mockReturnValue(handleError);

    render(<AuthCallbackScreen />);

    await waitFor(() => {
      expect(handleError).toHaveBeenCalled();
    });
  });
});
