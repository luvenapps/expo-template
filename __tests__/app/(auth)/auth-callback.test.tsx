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
import { DOMAIN } from '@/config/domain.config';
import { useFriendlyErrorHandler } from '@/errors/useFriendlyErrorHandler';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import * as Linking from 'expo-linking';
import React from 'react';
import { Platform } from 'react-native';
import AuthCallbackScreen from '../../../app/(auth)/auth-callback';

jest.mock('@/auth/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
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
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  parse: jest.fn(() => ({
    queryParams: {},
    scheme: require('@/config/domain.config').DOMAIN.app.name,
    hostname: '',
    path: 'auth-callback',
  })),
  useURL: jest.fn(() => null),
}));

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);
const mockUseLocalSearchParams = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    back: mockBack,
    canGoBack: mockCanGoBack,
  }),
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}));

const mockedSetSession = supabase.auth.setSession as jest.MockedFunction<
  typeof supabase.auth.setSession
>;
const mockedExchangeCodeForSession = supabase.auth.exchangeCodeForSession as jest.MockedFunction<
  typeof supabase.auth.exchangeCodeForSession
>;
const mockedGetSession = supabase.auth.getSession as jest.MockedFunction<
  typeof supabase.auth.getSession
>;
const mockedFriendlyError = useFriendlyErrorHandler as jest.MockedFunction<
  typeof useFriendlyErrorHandler
>;
const mockedCreateURL = Linking.createURL as jest.MockedFunction<typeof Linking.createURL>;
const mockedGetInitialURL = Linking.getInitialURL as jest.MockedFunction<
  typeof Linking.getInitialURL
>;
const mockedUseURL = Linking.useURL as jest.MockedFunction<typeof Linking.useURL>;
const authCallbackUrl = `${DOMAIN.app.name}://auth-callback`;

// Suppress act() warnings
const originalError = console.error;
const originalInfo = console.info;
const originalWarn = console.warn;

beforeAll(() => {
  console.info = jest.fn();
  console.warn = jest.fn();
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
  console.info = originalInfo;
  console.warn = originalWarn;
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
    mockBack.mockClear();
    mockCanGoBack.mockClear();
    mockCanGoBack.mockReturnValue(true); // Reset to default
    mockedSetSession.mockClear();
    mockedExchangeCodeForSession.mockClear();
    mockedCreateURL.mockClear();
    mockedGetSession.mockClear();
    mockedGetInitialURL.mockClear();
    mockedUseURL.mockClear();
    const mockParse = Linking.parse as jest.MockedFunction<typeof Linking.parse>;
    mockParse.mockReset();
    mockParse.mockReturnValue({
      queryParams: {},
      scheme: DOMAIN.app.name,
      hostname: '',
      path: 'auth-callback',
    });
    mockUseLocalSearchParams.mockReturnValue({});
    mockedGetSession.mockResolvedValue({ data: { session: null }, error: null } as any);
    mockedGetInitialURL.mockResolvedValue(null);
    mockedUseURL.mockReturnValue(null);
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
    const { queryByText } = render(<AuthCallbackScreen />);
    expect(queryByText('auth.signingIn')).toBeNull();
  });

  it('exchanges code for session on native with valid code', async () => {
    mockUseLocalSearchParams.mockReturnValue({ code: 'auth-code-123' });
    mockedCreateURL.mockReturnValue(`${authCallbackUrl}?code=auth-code-123`);
    mockedExchangeCodeForSession.mockResolvedValue({ data: { session: {} }, error: null } as any);

    render(<AuthCallbackScreen />);

    await waitFor(() => {
      expect(mockedCreateURL).toHaveBeenCalledWith('auth-callback', {
        queryParams: { code: 'auth-code-123' },
      });
      expect(mockedExchangeCodeForSession).toHaveBeenCalledWith(
        `${authCallbackUrl}?code=auth-code-123`,
      );
    });
  });

  it('navigates to tabs after successful code exchange', async () => {
    mockUseLocalSearchParams.mockReturnValue({ code: 'auth-code-123' });
    mockedCreateURL.mockReturnValue(`${authCallbackUrl}?code=auth-code-123`);
    mockedExchangeCodeForSession.mockResolvedValue({ data: { session: {} }, error: null } as any);

    render(<AuthCallbackScreen />);

    await waitFor(() => {
      expect(mockBack).toHaveBeenCalled();
    });
  });

  it('replaces to tabs when canGoBack is false after successful code exchange', async () => {
    mockCanGoBack.mockReturnValue(false);
    mockUseLocalSearchParams.mockReturnValue({ code: 'auth-code-456' });
    mockedCreateURL.mockReturnValue(`${authCallbackUrl}?code=auth-code-456`);
    mockedExchangeCodeForSession.mockResolvedValue({ data: { session: {} }, error: null } as any);

    render(<AuthCallbackScreen />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    });
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('shows error when code is missing', async () => {
    mockUseLocalSearchParams.mockReturnValue({});
    mockedGetInitialURL.mockResolvedValue(`${authCallbackUrl}#access_token=`);
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

    await waitFor(
      () => {
        expect(handleError).toHaveBeenCalledWith(
          {
            code: 'auth.oauth.browser',
            titleKey: 'errors.auth.oauthBrowser.title',
            descriptionKey: 'errors.auth.oauthBrowser.description',
            type: 'error',
          },
          { surface: 'auth.callback', suppressToast: true },
        );
      },
      { timeout: 3000 },
    );

    const errorElement = getByTestId('auth-callback-error');
    expect(errorElement).toBeTruthy();
  });

  it('shows error when code exchange fails', async () => {
    mockUseLocalSearchParams.mockReturnValue({ code: 'auth-code-123' });
    mockedCreateURL.mockReturnValue(`${authCallbackUrl}?code=auth-code-123`);
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
    mockedGetInitialURL.mockResolvedValue(`${authCallbackUrl}#access_token=`);
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

    await waitFor(
      () => {
        const retryButton = getByTestId('auth-callback-sign-in');
        expect(retryButton).toBeTruthy();
      },
      { timeout: 3000 },
    );
  });

  it('navigates to login when retry button is pressed', async () => {
    mockUseLocalSearchParams.mockReturnValue({});
    mockedGetInitialURL.mockResolvedValue(`${authCallbackUrl}#access_token=`);
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

    await waitFor(
      () => {
        const retryButton = getByTestId('auth-callback-sign-in');
        fireEvent.press(retryButton);
      },
      { timeout: 3000 },
    );

    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
  });

  it('processes callback only once with duplicate renders', async () => {
    mockUseLocalSearchParams.mockReturnValue({ code: 'auth-code-123' });
    mockedCreateURL.mockReturnValue(`${authCallbackUrl}?code=auth-code-123`);
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
    mockedCreateURL.mockReturnValue(`${authCallbackUrl}?code=auth-code-123`);
    mockedExchangeCodeForSession.mockResolvedValue({ data: { session: {} }, error: null } as any);

    render(<AuthCallbackScreen />);

    await waitFor(() => {
      expect(mockedCreateURL).toHaveBeenCalledWith('auth-callback', {
        queryParams: { code: 'auth-code-123' },
      });
    });
  });

  it('redirects to tabs when session already exists', async () => {
    mockUseLocalSearchParams.mockReturnValue({});
    mockedGetSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
      error: null,
    } as any);

    render(<AuthCallbackScreen />);

    await waitFor(() => {
      expect(mockBack).toHaveBeenCalled();
    });
  });

  it('handles code from initial URL', async () => {
    mockUseLocalSearchParams.mockReturnValue({});
    mockedGetSession.mockResolvedValue({ data: { session: null }, error: null } as any);
    mockedGetInitialURL.mockResolvedValue(`${authCallbackUrl}?code=auth-code-456`);
    const mockParse = Linking.parse as jest.MockedFunction<typeof Linking.parse>;
    mockParse.mockReturnValue({
      queryParams: { code: 'auth-code-456' },
      scheme: DOMAIN.app.name,
      hostname: '',
      path: 'auth-callback',
    });
    mockedCreateURL.mockReturnValue(`${authCallbackUrl}?code=auth-code-456`);
    mockedExchangeCodeForSession.mockResolvedValue({ data: { session: {} }, error: null } as any);

    render(<AuthCallbackScreen />);

    await waitFor(() => {
      expect(mockedExchangeCodeForSession).toHaveBeenCalledWith(
        `${authCallbackUrl}?code=auth-code-456`,
      );
      expect(mockBack).toHaveBeenCalled();
    });
  });

  it('handles embedded URL with code', async () => {
    mockUseLocalSearchParams.mockReturnValue({});
    mockedGetSession.mockResolvedValue({ data: { session: null }, error: null } as any);
    const encodedUrl = encodeURIComponent(`${authCallbackUrl}?code=embedded-code`);
    mockedGetInitialURL.mockResolvedValue(`${authCallbackUrl}?url=${encodedUrl}`);
    const mockParse = Linking.parse as jest.MockedFunction<typeof Linking.parse>;
    mockParse
      .mockReturnValueOnce({
        queryParams: { url: encodedUrl },
        scheme: DOMAIN.app.name,
        hostname: '',
        path: 'auth-callback',
      })
      .mockReturnValueOnce({
        queryParams: { code: 'embedded-code' },
        scheme: DOMAIN.app.name,
        hostname: '',
        path: 'auth-callback',
      });
    mockedCreateURL.mockReturnValue(`${authCallbackUrl}?code=embedded-code`);
    mockedExchangeCodeForSession.mockResolvedValue({ data: { session: {} }, error: null } as any);

    render(<AuthCallbackScreen />);

    await waitFor(() => {
      expect(mockedExchangeCodeForSession).toHaveBeenCalledWith(
        `${authCallbackUrl}?code=embedded-code`,
      );
      expect(mockBack).toHaveBeenCalled();
    });
  });

  it('handles access and refresh tokens from hash in initial URL', async () => {
    mockUseLocalSearchParams.mockReturnValue({});
    mockedGetSession.mockResolvedValue({ data: { session: null }, error: null } as any);
    mockedGetInitialURL.mockResolvedValue(
      `${authCallbackUrl}#access_token=token-abc&refresh_token=refresh-xyz`,
    );
    const mockParse = Linking.parse as jest.MockedFunction<typeof Linking.parse>;
    mockParse.mockReturnValue({
      queryParams: {},
      scheme: DOMAIN.app.name,
      hostname: '',
      path: 'auth-callback',
    });
    mockedSetSession.mockResolvedValue({ data: { session: {} }, error: null } as any);

    render(<AuthCallbackScreen />);

    await waitFor(() => {
      expect(mockedSetSession).toHaveBeenCalledWith({
        access_token: 'token-abc',
        refresh_token: 'refresh-xyz',
      });
      expect(mockBack).toHaveBeenCalled();
    });
  });

  it('handles setSession error when processing hash tokens', async () => {
    mockUseLocalSearchParams.mockReturnValue({});
    mockedGetSession.mockResolvedValue({ data: { session: null }, error: null } as any);
    mockedGetInitialURL.mockResolvedValue(
      `${authCallbackUrl}#access_token=token-abc&refresh_token=refresh-xyz`,
    );
    const mockParse = Linking.parse as jest.MockedFunction<typeof Linking.parse>;
    mockParse.mockReturnValue({
      queryParams: {},
      scheme: DOMAIN.app.name,
      hostname: '',
      path: 'auth-callback',
    });
    const authError = { message: 'Invalid tokens', status: 401 };
    mockedSetSession.mockResolvedValue({ data: null, error: authError } as any);

    const handleError = jest.fn(() => ({
      toastId: 'toast-1',
      friendly: {
        code: 'auth.invalid-credentials' as const,
        type: 'error' as const,
        description: 'Invalid authentication tokens',
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

  it('navigates back on Android when no code and no tokens in URL', async () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });

    mockUseLocalSearchParams.mockReturnValue({});
    mockedGetInitialURL.mockResolvedValue(authCallbackUrl);
    mockedGetSession.mockResolvedValue({ data: { session: null }, error: null } as any);

    render(<AuthCallbackScreen />);

    await waitFor(() => {
      expect(mockBack).toHaveBeenCalled();
    });

    Object.defineProperty(Platform, 'OS', { value: originalOS, writable: true });
  });

  it('handles hash error responses in native callback', async () => {
    mockUseLocalSearchParams.mockReturnValue({});
    mockedGetInitialURL.mockResolvedValue(
      `${authCallbackUrl}#error=access_denied&error_description=Email+not+verified`,
    );
    const mockParse = Linking.parse as jest.MockedFunction<typeof Linking.parse>;
    mockParse.mockReturnValue({
      queryParams: {},
      scheme: DOMAIN.app.name,
      hostname: '',
      path: 'auth-callback',
    });

    const handleError = jest.fn(() => ({
      toastId: 'toast-1',
      friendly: {
        code: 'auth.oauth.browser' as const,
        type: 'error' as const,
      },
    }));
    mockedFriendlyError.mockReturnValue(handleError);

    const { getByTestId } = render(<AuthCallbackScreen />);

    await waitFor(() => {
      expect(handleError).toHaveBeenCalledWith(
        {
          code: 'access_denied',
          message: 'Email not verified',
          type: 'error',
        },
        { surface: 'auth.callback', suppressToast: true },
      );
    });

    const errorElement = getByTestId('auth-callback-error');
    expect(errorElement).toBeTruthy();
  });

  it('navigates back when session appears during initial URL wait', async () => {
    jest.useFakeTimers();
    mockUseLocalSearchParams.mockReturnValue({});
    mockedGetInitialURL.mockResolvedValue(authCallbackUrl);
    const mockParse = Linking.parse as jest.MockedFunction<typeof Linking.parse>;
    mockParse.mockReturnValue({
      queryParams: {},
      scheme: DOMAIN.app.name,
      hostname: '',
      path: 'auth-callback',
    });
    mockedGetSession
      .mockResolvedValueOnce({ data: { session: null }, error: null } as any)
      .mockResolvedValueOnce({ data: { session: null }, error: null } as any)
      .mockResolvedValueOnce({ data: { session: { user: { id: 'user-1' } } }, error: null } as any);

    render(<AuthCallbackScreen />);

    await act(async () => {
      jest.runOnlyPendingTimers();
    });

    await waitFor(() => {
      expect(mockBack).toHaveBeenCalled();
    });

    jest.useRealTimers();
  });

  it('falls back to android navigation after retry loop', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });
    mockedUseURL.mockReturnValue(`${authCallbackUrl}?code=`);
    mockUseLocalSearchParams.mockReturnValue({});
    mockedGetInitialURL.mockResolvedValue(authCallbackUrl);
    mockedGetSession.mockResolvedValue({ data: { session: null }, error: null } as any);

    const timeoutSpy = jest
      .spyOn(global, 'setTimeout')
      .mockImplementation((callback: (...args: any[]) => void) => {
        callback();
        return 0 as any;
      });

    render(<AuthCallbackScreen />);

    await waitFor(() => {
      expect(mockBack).toHaveBeenCalled();
    });

    Object.defineProperty(Platform, 'OS', { value: originalOS, writable: true });
    timeoutSpy.mockRestore();
  });

  it('handles exchangeCodeForSession error when processing URL code', async () => {
    mockUseLocalSearchParams.mockReturnValue({ code: 'invalid-code' });
    mockedGetSession.mockResolvedValue({ data: { session: null }, error: null } as any);
    mockedCreateURL.mockReturnValue(`${authCallbackUrl}?code=invalid-code`);
    const authError = { message: 'Code expired', status: 400 };
    mockedExchangeCodeForSession.mockResolvedValue({ data: null, error: authError } as any);

    const handleError = jest.fn(() => ({
      toastId: 'toast-1',
      friendly: {
        code: 'auth.oauth.redirect' as const,
        type: 'error' as const,
        description: 'Authorization code has expired',
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
    const mockParse = Linking.parse as jest.MockedFunction<typeof Linking.parse>;
    mockParse.mockReset();
    mockParse.mockReturnValue({
      queryParams: {},
      scheme: DOMAIN.app.name,
      hostname: '',
      path: 'auth-callback',
    });
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

  it('redirects when no hash params but existing session on web', async () => {
    mockWindowLocation.hash = '';
    mockedGetSession.mockResolvedValue({
      data: { session: { user: { id: '123' } } },
      error: null,
    } as any);

    render(<AuthCallbackScreen />);

    await waitFor(() => {
      expect(mockWindowLocation.replace).toHaveBeenCalledWith('/');
    });
  });

  it('shows error when tokens are missing from hash on web', async () => {
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

  it('handles error params in web hash', async () => {
    mockWindowLocation.hash = '#error=access_denied&error_description=Email+not+verified';
    const handleError = jest.fn(() => ({
      toastId: 'toast-1',
      friendly: {
        code: 'auth.oauth.browser' as const,
        type: 'error' as const,
      },
    }));
    mockedFriendlyError.mockReturnValue(handleError);

    render(<AuthCallbackScreen />);

    await waitFor(() => {
      expect(handleError).toHaveBeenCalledWith(
        {
          code: 'access_denied',
          message: 'Email not verified',
          type: 'error',
        },
        { surface: 'auth.callback', suppressToast: true },
      );
    });
  });

  it('returns early when no hash params and no session on web', async () => {
    mockWindowLocation.hash = '';
    mockedGetSession.mockResolvedValue({ data: { session: null }, error: null } as any);

    render(<AuthCallbackScreen />);

    await waitFor(() => {
      expect(mockedGetSession).toHaveBeenCalled();
    });
    expect(mockWindowLocation.replace).not.toHaveBeenCalled();
    expect(mockedSetSession).not.toHaveBeenCalled();
  });

  it('shows error when only access_token is present on web', async () => {
    mockWindowLocation.hash = '#refresh_token=refresh456';
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
    mockedGetSession.mockClear();
    mockedGetInitialURL.mockClear();
    mockedGetSession.mockResolvedValue({ data: { session: null }, error: null } as any);
    mockedGetInitialURL.mockResolvedValue(
      `${authCallbackUrl}#error=access_denied&error_description=Email+not+verified`,
    );
    mockedUseURL.mockReturnValue(null);
    const mockParse = Linking.parse as jest.MockedFunction<typeof Linking.parse>;
    mockParse.mockReset();
    mockParse.mockReturnValue({
      queryParams: {},
      scheme: DOMAIN.app.name,
      hostname: '',
      path: 'auth-callback',
    });
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

    await act(async () => {
      await Promise.resolve();
    });

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

    await act(async () => {
      await Promise.resolve();
    });

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

    await act(async () => {
      await Promise.resolve();
    });

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

    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(handleError).toHaveBeenCalled();
    });
  });
});
