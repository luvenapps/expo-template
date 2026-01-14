import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import {
  signInWithEmail,
  signInWithOAuth,
  signOut,
  signUpWithEmail,
  sendPasswordReset,
} from '@/auth/service';

jest.mock('@/auth/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signInWithOAuth: jest.fn(),
      signInWithIdToken: jest.fn(),
      exchangeCodeForSession: jest.fn(),
      setSession: jest.fn(),
      signOut: jest.fn(),
      signUp: jest.fn(),
      resetPasswordForEmail: jest.fn(),
    },
  },
}));

jest.mock('@/errors/friendly', () => ({
  resolveFriendlyError: jest.fn(() => ({
    code: 'unknown',
    title: 't',
    description: 'd',
    type: 'error',
    originalMessage: 'orig',
  })),
}));

jest.mock('expo-linking', () => ({
  createURL: jest.fn((path: string) => `myapp://${path}`),
  openURL: jest.fn(() => Promise.resolve()),
  parse: jest.fn((url: string) => {
    const [baseWithQuery] = url.split('#');
    const [base, query] = baseWithQuery.split('?');
    const queryParams: Record<string, string> = {};
    if (query) {
      for (const part of query.split('&')) {
        const [key, value] = part.split('=');
        if (key) {
          queryParams[key] = value ?? '';
        }
      }
    }
    return {
      queryParams,
      scheme: base.split(':')[0],
      hostname: '',
      path: '',
    };
  }),
}));

jest.mock('expo-apple-authentication', () => {
  const mock = {
    signInAsync: jest.fn(),
    isAvailableAsync: jest.fn(() => Promise.resolve(false)),
    AppleAuthenticationScope: { EMAIL: 0, FULL_NAME: 1 },
  };
  return mock;
});

jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(() => Promise.resolve('hashed')),
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
}));

// Create a mutable mock for expo-web-browser that can be modified in tests
const mockWebBrowser: {
  openAuthSessionAsync: jest.Mock | undefined;
} = {
  openAuthSessionAsync: jest.fn(),
};

jest.mock('expo-web-browser', () => ({
  __esModule: true,
  get openAuthSessionAsync() {
    return mockWebBrowser.openAuthSessionAsync;
  },
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}));

describe('auth/service', () => {
  const originalOS = Platform.OS;
  const originalLocation = window.location;
  const supabase = require('@/auth/client').supabase as any;
  const resolveFriendlyError = require('@/errors/friendly').resolveFriendlyError as jest.Mock;
  const appleAuth = require('expo-apple-authentication');
  const crypto = require('expo-crypto');
  const linkingModule = Linking as jest.Mocked<typeof Linking>;

  // Mock console methods to suppress logs in tests
  const originalConsoleInfo = console.info;
  const originalConsoleError = console.error;

  beforeAll(() => {
    console.info = jest.fn();
    console.error = jest.fn();
  });

  afterAll(() => {
    console.info = originalConsoleInfo;
    console.error = originalConsoleError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', {
      value: originalOS,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    // Default mock for signInWithOAuth to prevent undefined errors
    supabase.auth.signInWithOAuth.mockResolvedValue({ data: { url: null }, error: null });
    // Restore default implementations for expo modules after clearAllMocks
    resolveFriendlyError.mockReset();
    resolveFriendlyError.mockImplementation(() => ({
      code: 'unknown',
      title: 't',
      description: 'd',
      type: 'error',
      originalMessage: 'orig',
    }));
    appleAuth.isAvailableAsync.mockImplementation(() => Promise.resolve(false));
    appleAuth.signInAsync.mockImplementation(() => Promise.reject(new Error('Not mocked')));
    crypto.digestStringAsync.mockImplementation(() => Promise.resolve('hashed'));
    // Reset mockWebBrowser to default state
    mockWebBrowser.openAuthSessionAsync = jest.fn();
  });

  it('uses native Apple sign-in on iOS when available', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });

    appleAuth.isAvailableAsync.mockImplementationOnce(() => Promise.resolve(true));
    appleAuth.signInAsync.mockImplementationOnce(() =>
      Promise.resolve({
        identityToken: 'token',
        authorizationCode: 'code',
        user: 'user-id',
        email: 'test@example.com',
        fullName: { givenName: 'Test', familyName: 'User' },
        realUserStatus: 1,
      }),
    );
    supabase.auth.signInWithIdToken.mockResolvedValueOnce({ data: { session: {} }, error: null });

    const result = await signInWithOAuth('apple');

    expect(appleAuth.isAvailableAsync).toHaveBeenCalled();
    expect(appleAuth.signInAsync).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(supabase.auth.signInWithIdToken).toHaveBeenCalled();
    expect(supabase.auth.signInWithOAuth).not.toHaveBeenCalled();
  });

  it('handles missing identity token from Apple sign-in', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });

    appleAuth.isAvailableAsync.mockImplementationOnce(() => Promise.resolve(true));
    appleAuth.signInAsync.mockImplementationOnce(() =>
      Promise.resolve({
        identityToken: null, // Missing token
        authorizationCode: 'code',
        user: 'user-id',
        email: 'test@example.com',
        fullName: { givenName: 'Test', familyName: 'User' },
        realUserStatus: 1,
      }),
    );
    resolveFriendlyError.mockReturnValueOnce({
      code: 'auth.apple.no-token',
      description: 'Missing identity token',
      type: 'error',
    });

    const result = await signInWithOAuth('apple');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Missing identity token');
    expect(supabase.auth.signInWithIdToken).not.toHaveBeenCalled();
  });

  it('handles Supabase error during Apple ID token exchange', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });

    appleAuth.isAvailableAsync.mockImplementationOnce(() => Promise.resolve(true));
    appleAuth.signInAsync.mockImplementationOnce(() =>
      Promise.resolve({
        identityToken: 'token',
        authorizationCode: 'code',
        user: 'user-id',
        email: 'test@example.com',
        fullName: { givenName: 'Test', familyName: 'User' },
        realUserStatus: 1,
      }),
    );
    supabase.auth.signInWithIdToken.mockResolvedValueOnce({
      data: null,
      error: { message: 'Invalid token', status: 401, code: 'invalid_token' },
    });
    resolveFriendlyError.mockReturnValueOnce({
      code: 'auth.invalid-credentials',
      description: 'Invalid Apple token',
      type: 'error',
    });

    const result = await signInWithOAuth('apple');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid Apple token');
  });

  it('handles Apple sign-in exception', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });

    appleAuth.isAvailableAsync.mockImplementationOnce(() => Promise.resolve(true));
    appleAuth.signInAsync.mockImplementationOnce(() =>
      Promise.reject({ code: '1001', domain: 'ASAuthorization', message: 'User canceled' }),
    );
    resolveFriendlyError.mockReturnValueOnce({
      code: 'auth.canceled',
      description: 'Sign in was canceled',
      type: 'error',
    });

    const result = await signInWithOAuth('apple');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Sign in was canceled');
  });

  it('handles isAvailableAsync exception', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });

    appleAuth.isAvailableAsync.mockImplementationOnce(() =>
      Promise.reject(new Error('Not supported')),
    );
    supabase.auth.signInWithOAuth.mockResolvedValueOnce({
      data: { url: 'https://provider.com/auth' },
      error: null,
    });
    mockWebBrowser.openAuthSessionAsync = jest.fn(() => Promise.resolve());

    const result = await signInWithOAuth('apple');

    // Should fall back to web OAuth flow
    expect(result.success).toBe(true);
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalled();
  });

  it('uses title fallback when description is missing for Apple token error', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });

    appleAuth.isAvailableAsync.mockImplementationOnce(() => Promise.resolve(true));
    appleAuth.signInAsync.mockImplementationOnce(() =>
      Promise.resolve({
        identityToken: null,
        authorizationCode: 'code',
        user: 'user-id',
      }),
    );
    resolveFriendlyError.mockReturnValueOnce({
      code: 'auth.apple.no-token',
      title: 'Token Missing',
      type: 'error',
    });

    const result = await signInWithOAuth('apple');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Token Missing');
  });

  it('uses descriptionKey fallback for Apple ID exchange error', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });

    appleAuth.isAvailableAsync.mockImplementationOnce(() => Promise.resolve(true));
    appleAuth.signInAsync.mockImplementationOnce(() =>
      Promise.resolve({
        identityToken: 'token',
        authorizationCode: 'code',
        user: 'user-id',
      }),
    );
    supabase.auth.signInWithIdToken.mockResolvedValueOnce({
      data: null,
      error: { message: 'Invalid' },
    });
    resolveFriendlyError.mockReturnValueOnce({
      code: 'auth.invalid',
      descriptionKey: 'errors.auth.invalid.description',
      type: 'error',
    });

    const result = await signInWithOAuth('apple');

    expect(result.success).toBe(false);
    expect(result.error).toBe('errors.auth.invalid.description');
  });

  it('uses titleKey fallback for Apple sign-in exception', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });

    appleAuth.isAvailableAsync.mockImplementationOnce(() => Promise.resolve(true));
    appleAuth.signInAsync.mockImplementationOnce(() => Promise.reject(new Error('Failed')));
    resolveFriendlyError.mockReturnValueOnce({
      code: 'auth.failed',
      titleKey: 'errors.auth.failed.title',
      type: 'error',
    });

    const result = await signInWithOAuth('apple');

    expect(result.success).toBe(false);
    expect(result.error).toBe('errors.auth.failed.title');
  });

  it('returns friendly error on signInWithEmail failure', async () => {
    supabase.auth.signInWithPassword.mockResolvedValueOnce({ error: new Error('boom') });
    resolveFriendlyError.mockReturnValueOnce({
      code: 'auth.invalid-credentials',
      descriptionKey: 'errors.auth.invalidCredentials.description',
      type: 'error',
      originalMessage: 'bad creds',
    });
    const result = await signInWithEmail('a@b.com', 'pw');
    expect(result.success).toBe(false);
    expect(result.error).toBe('bad creds');
    expect(result.code).toBe('auth.invalid-credentials');
  });

  it('returns success on signInWithOAuth when no url returned', async () => {
    supabase.auth.signInWithOAuth.mockResolvedValueOnce({ data: { url: null }, error: null });
    const result = await signInWithOAuth('google');
    expect(result.success).toBe(true);
  });

  it('opens browser on web signInWithOAuth', async () => {
    jest.useFakeTimers();
    Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
    const assignSpy = jest.fn();
    const mockLocation = { ...window.location, assign: assignSpy, origin: 'https://test.com' };
    Object.defineProperty(window, 'location', { configurable: true, value: mockLocation });
    supabase.auth.signInWithOAuth.mockResolvedValueOnce({
      data: { url: 'https://example.com' },
      error: null,
    });
    const result = await signInWithOAuth('google');
    expect(result.success).toBe(true);
    jest.runAllTimers();
    expect(assignSpy).toHaveBeenCalledWith('https://example.com');
    assignSpy.mockRestore();
    jest.useRealTimers();
  });

  it('falls back to Linking when openAuthSessionAsync missing', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true, configurable: true });
    mockWebBrowser.openAuthSessionAsync = undefined;
    appleAuth.isAvailableAsync.mockResolvedValueOnce(false);
    supabase.auth.signInWithOAuth.mockResolvedValueOnce({
      data: { url: 'https://example.com' },
      error: null,
    });
    const result = await signInWithOAuth('google');
    expect(result.success).toBe(true);
    expect(linkingModule.openURL).toHaveBeenCalledWith('https://example.com');
  });

  it('calls openAuthSessionAsync when available', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true, configurable: true });
    const openAuthSessionAsync = jest.fn(() =>
      Promise.resolve({ type: 'success', url: 'myapp://auth-callback?code=abc' }),
    );
    mockWebBrowser.openAuthSessionAsync = openAuthSessionAsync;
    appleAuth.isAvailableAsync.mockResolvedValueOnce(false);
    supabase.auth.signInWithOAuth.mockResolvedValueOnce({
      data: { url: 'https://example.com' },
      error: null,
    });
    supabase.auth.exchangeCodeForSession.mockResolvedValueOnce({ error: null });
    const result = await signInWithOAuth('google');
    expect(result.success).toBe(true);
    expect(openAuthSessionAsync).toHaveBeenCalled();
    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith(
      'myapp://auth-callback?code=abc',
    );
  });

  it('handles openAuthSessionAsync failure', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true, configurable: true });
    const openAuthSessionAsync = jest.fn(() => Promise.reject(new Error('browser fail')));
    mockWebBrowser.openAuthSessionAsync = openAuthSessionAsync;
    appleAuth.isAvailableAsync.mockResolvedValueOnce(false);
    supabase.auth.signInWithOAuth.mockResolvedValueOnce({
      data: { url: 'https://example.com' },
      error: null,
    });
    const result = await signInWithOAuth('google');
    expect(result.success).toBe(false);
    expect(result.code).toBe('auth.oauth.browser');
    expect(result.error).toContain('browser fail');
  });

  it('returns friendly error on signOut failure', async () => {
    supabase.auth.signOut.mockResolvedValueOnce({ error: new Error('signout') });
    resolveFriendlyError.mockReturnValueOnce({
      code: 'unknown',
      description: 'signout fail',
      type: 'error',
    });
    const result = await signOut();
    expect(result.success).toBe(false);
    expect(result.error).toBe('signout fail');
  });

  it('treats 403 signOut errors as success', async () => {
    supabase.auth.signOut.mockResolvedValueOnce({ error: { status: 403 } });
    const result = await signOut();
    expect(result.success).toBe(true);
  });

  it('returns friendly error on signUpWithEmail failure', async () => {
    supabase.auth.signUp.mockResolvedValueOnce({ error: new Error('signup') });
    resolveFriendlyError.mockReturnValueOnce({
      code: 'unknown',
      description: 'signup fail',
      type: 'error',
    });
    const result = await signUpWithEmail('a@b.com', 'pw');
    expect(result.success).toBe(false);
    expect(result.error).toBe('signup fail');
  });

  it('returns friendly error on sendPasswordReset failure', async () => {
    supabase.auth.resetPasswordForEmail.mockResolvedValueOnce({ error: new Error('reset') });
    resolveFriendlyError.mockReturnValueOnce({
      code: 'unknown',
      description: 'reset fail',
      type: 'error',
    });
    const result = await sendPasswordReset('a@b.com');
    expect(result.success).toBe(false);
    expect(result.error).toBe('reset fail');
  });

  it('returns success on signInWithEmail success', async () => {
    supabase.auth.signInWithPassword.mockResolvedValueOnce({ error: null });
    const result = await signInWithEmail('a@b.com', 'pw');
    expect(result.success).toBe(true);
  });

  it('returns success on signOut', async () => {
    supabase.auth.signOut.mockResolvedValueOnce({ error: null });
    const result = await signOut();
    expect(result.success).toBe(true);
  });

  it('returns success on signUpWithEmail', async () => {
    supabase.auth.signUp.mockResolvedValueOnce({ error: null });
    const result = await signUpWithEmail('a@b.com', 'pw');
    expect(result.success).toBe(true);
  });

  it('returns success on sendPasswordReset', async () => {
    supabase.auth.resetPasswordForEmail.mockResolvedValueOnce({ error: null });
    const result = await sendPasswordReset('a@b.com');
    expect(result.success).toBe(true);
  });

  it('returns friendly error on signInWithOAuth failure', async () => {
    supabase.auth.signInWithOAuth.mockResolvedValueOnce({
      data: null,
      error: new Error('oauth fail'),
    });
    resolveFriendlyError.mockReturnValueOnce({
      code: 'auth.oauth.browser',
      description: 'oauth friendly',
      type: 'error',
    });
    const result = await signInWithOAuth('google');
    expect(result.success).toBe(false);
    expect(result.error).toBe('oauth friendly');
  });

  it('falls back to titleKey when friendly error has no message fields', async () => {
    supabase.auth.signInWithPassword.mockResolvedValueOnce({ error: new Error('bad') });
    resolveFriendlyError.mockReturnValueOnce({
      code: 'auth.missing',
      titleKey: 'errors.auth.missingTitle',
      type: 'error',
    });
    const result = await signInWithEmail('user@example.com', 'pw');
    expect(result.success).toBe(false);
    expect(result.error).toBe('errors.auth.missingTitle');
  });

  it('uses descriptionKey fallback on signOut error', async () => {
    supabase.auth.signOut.mockResolvedValueOnce({ error: new Error('oops') });
    resolveFriendlyError.mockReturnValueOnce({
      code: 'auth.signout',
      descriptionKey: 'errors.auth.signout.description',
      type: 'error',
    });
    const result = await signOut();
    expect(result.success).toBe(false);
    expect(result.error).toBe('errors.auth.signout.description');
  });

  it('uses titleKey fallback on password reset error', async () => {
    supabase.auth.resetPasswordForEmail.mockResolvedValueOnce({ error: new Error('reset') });
    resolveFriendlyError.mockReturnValueOnce({
      code: 'auth.reset',
      titleKey: 'errors.auth.reset.title',
      type: 'error',
    });
    const result = await sendPasswordReset('a@b.com');
    expect(result.success).toBe(false);
    expect(result.error).toBe('errors.auth.reset.title');
  });

  describe('signOut HTTP error codes', () => {
    it('treats 401 as successful signOut', async () => {
      supabase.auth.signOut.mockResolvedValueOnce({
        error: { message: 'Unauthorized', status: 401 },
      });
      const result = await signOut();
      expect(result.success).toBe(true);
    });

    it('treats 403 as successful signOut', async () => {
      supabase.auth.signOut.mockResolvedValueOnce({
        error: { message: 'Forbidden', status: 403 },
      });
      const result = await signOut();
      expect(result.success).toBe(true);
    });

    it('treats 404 as successful signOut', async () => {
      supabase.auth.signOut.mockResolvedValueOnce({
        error: { message: 'Not found', status: 404 },
      });
      const result = await signOut();
      expect(result.success).toBe(true);
    });

    it('returns error for 500 status code', async () => {
      supabase.auth.signOut.mockResolvedValueOnce({
        error: { message: 'Server error', status: 500 },
      });
      resolveFriendlyError.mockReturnValueOnce({
        code: 'auth.server-error',
        description: 'Server error occurred',
        type: 'error',
      });
      const result = await signOut();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Server error occurred');
    });

    it('returns error for error without status code', async () => {
      supabase.auth.signOut.mockResolvedValueOnce({
        error: { message: 'Unknown error' },
      });
      resolveFriendlyError.mockReturnValueOnce({
        code: 'auth.unknown',
        description: 'Unknown error',
        type: 'error',
      });
      const result = await signOut();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });
  });

  describe('OAuth redirect edge cases', () => {
    it('handles OAuth redirect with missing access_token', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      supabase.auth.signInWithOAuth.mockResolvedValueOnce({
        data: { url: 'https://provider.com/auth' },
        error: null,
      });
      mockWebBrowser.openAuthSessionAsync = jest.fn().mockResolvedValueOnce({
        type: 'success',
        url: 'myapp://auth-callback#refresh_token=refresh123',
      });
      resolveFriendlyError.mockReturnValueOnce({
        code: 'auth.oauth.missing-tokens',
        description: 'Missing tokens',
        type: 'error',
      });

      const result = await signInWithOAuth('google');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing tokens');
    });

    it('handles OAuth redirect with missing refresh_token', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      supabase.auth.signInWithOAuth.mockResolvedValueOnce({
        data: { url: 'https://provider.com/auth' },
        error: null,
      });
      mockWebBrowser.openAuthSessionAsync = jest.fn().mockResolvedValueOnce({
        type: 'success',
        url: 'myapp://auth-callback#access_token=access123',
      });
      resolveFriendlyError.mockReturnValueOnce({
        code: 'auth.oauth.missing-tokens',
        description: 'Missing tokens',
        type: 'error',
      });

      const result = await signInWithOAuth('google');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing tokens');
    });

    it('handles OAuth redirect with valid access and refresh tokens', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      supabase.auth.signInWithOAuth.mockResolvedValueOnce({
        data: { url: 'https://provider.com/auth' },
        error: null,
      });
      mockWebBrowser.openAuthSessionAsync = jest.fn().mockResolvedValueOnce({
        type: 'success',
        url: 'myapp://auth-callback#access_token=access123&refresh_token=refresh123',
      });
      supabase.auth.setSession.mockResolvedValueOnce({ data: { session: {} }, error: null });

      const result = await signInWithOAuth('google');

      expect(result.success).toBe(true);
      expect(supabase.auth.setSession).toHaveBeenCalledWith({
        access_token: 'access123',
        refresh_token: 'refresh123',
      });
    });

    it('handles setSession error when using access/refresh tokens', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      supabase.auth.signInWithOAuth.mockResolvedValueOnce({
        data: { url: 'https://provider.com/auth' },
        error: null,
      });
      mockWebBrowser.openAuthSessionAsync = jest.fn().mockResolvedValueOnce({
        type: 'success',
        url: 'myapp://auth-callback#access_token=access123&refresh_token=refresh123',
      });
      supabase.auth.setSession.mockResolvedValueOnce({
        data: null,
        error: { message: 'Invalid session' },
      });
      resolveFriendlyError.mockReturnValueOnce({
        code: 'auth.invalid-session',
        description: 'Session is invalid',
        type: 'error',
      });

      const result = await signInWithOAuth('google');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session is invalid');
    });

    it('handles OAuth redirect with authorization code', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      supabase.auth.signInWithOAuth.mockResolvedValueOnce({
        data: { url: 'https://provider.com/auth' },
        error: null,
      });
      mockWebBrowser.openAuthSessionAsync = jest.fn().mockResolvedValueOnce({
        type: 'success',
        url: 'myapp://auth-callback?code=authcode123',
      });
      supabase.auth.exchangeCodeForSession.mockResolvedValueOnce({
        data: { session: {} },
        error: null,
      });

      const result = await signInWithOAuth('google');

      expect(result.success).toBe(true);
      expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalled();
    });

    it('handles exchangeCodeForSession error', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      supabase.auth.signInWithOAuth.mockResolvedValueOnce({
        data: { url: 'https://provider.com/auth' },
        error: null,
      });
      mockWebBrowser.openAuthSessionAsync = jest.fn().mockResolvedValueOnce({
        type: 'success',
        url: 'myapp://auth-callback?code=authcode123',
      });
      supabase.auth.exchangeCodeForSession.mockResolvedValueOnce({
        data: null,
        error: { message: 'Invalid code' },
      });
      resolveFriendlyError.mockReturnValueOnce({
        code: 'auth.invalid-code',
        description: 'Code is invalid',
        type: 'error',
      });

      const result = await signInWithOAuth('google');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Code is invalid');
    });

    it('handles OAuth cancel', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      supabase.auth.signInWithOAuth.mockResolvedValueOnce({
        data: { url: 'https://provider.com/auth' },
        error: null,
      });
      mockWebBrowser.openAuthSessionAsync = jest.fn().mockResolvedValueOnce({
        type: 'cancel',
      });
      resolveFriendlyError.mockReturnValueOnce({
        code: 'auth.oauth.canceled',
        description: 'User canceled',
        type: 'error',
      });

      const result = await signInWithOAuth('google');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User canceled');
    });

    it('handles OAuth browser exception', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      supabase.auth.signInWithOAuth.mockResolvedValueOnce({
        data: { url: 'https://provider.com/auth' },
        error: null,
      });
      mockWebBrowser.openAuthSessionAsync = jest
        .fn()
        .mockRejectedValueOnce(new Error('Browser failed'));

      const result = await signInWithOAuth('google');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Browser failed');
      expect(result.code).toBe('auth.oauth.browser');
    });

    it('handles OAuth browser exception with non-Error object', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      supabase.auth.signInWithOAuth.mockResolvedValueOnce({
        data: { url: 'https://provider.com/auth' },
        error: null,
      });
      mockWebBrowser.openAuthSessionAsync = jest.fn().mockRejectedValueOnce('string error');

      const result = await signInWithOAuth('google');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unable to open sign-in window');
      expect(result.code).toBe('auth.oauth.browser');
    });
  });

  describe('OAuth browser fallback', () => {
    it('falls back to Linking.openURL when WebBrowser is unavailable', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });
      supabase.auth.signInWithOAuth.mockResolvedValueOnce({
        data: { url: 'https://provider.com/auth' },
        error: null,
      });
      // Simulate WebBrowser.openAuthSessionAsync being undefined
      mockWebBrowser.openAuthSessionAsync = undefined;

      const result = await signInWithOAuth('google');

      expect(result.success).toBe(true);
      expect(linkingModule.openURL).toHaveBeenCalledWith('https://provider.com/auth');
    });
  });

  describe('Apple auth platform variations', () => {
    it('uses web OAuth flow for Apple on Android', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });
      supabase.auth.signInWithOAuth.mockResolvedValueOnce({
        data: { url: 'https://appleid.apple.com/auth' },
        error: null,
      });
      mockWebBrowser.openAuthSessionAsync = jest.fn().mockResolvedValueOnce({
        type: 'success',
        url: 'myapp://auth-callback?code=appleCode',
      });
      supabase.auth.exchangeCodeForSession.mockResolvedValueOnce({
        data: { session: {} },
        error: null,
      });

      const result = await signInWithOAuth('apple');

      expect(result.success).toBe(true);
      expect(appleAuth.isAvailableAsync).not.toHaveBeenCalled();
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalled();
    });

    it('uses web OAuth flow for Apple on web platform', async () => {
      jest.useFakeTimers();
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
      const mockAssign = jest.fn();
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: {
          origin: 'https://app.example.com',
          assign: mockAssign,
        },
      });
      supabase.auth.signInWithOAuth.mockResolvedValueOnce({
        data: { url: 'https://appleid.apple.com/auth' },
        error: null,
      });

      const result = await signInWithOAuth('apple');

      expect(result.success).toBe(true);
      expect(appleAuth.isAvailableAsync).not.toHaveBeenCalled();

      // Run the setTimeout callback
      jest.runAllTimers();
      expect(mockAssign).toHaveBeenCalledWith('https://appleid.apple.com/auth');

      jest.useRealTimers();
    });
  });

  describe('Redirect URL construction', () => {
    it('uses window.location.origin for web platform in OAuth', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: {
          origin: 'https://app.example.com',
          assign: jest.fn(),
        },
      });
      supabase.auth.signInWithOAuth.mockResolvedValueOnce({
        data: { url: 'https://provider.com/auth' },
        error: null,
      });

      await signInWithOAuth('google');

      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'https://app.example.com/auth-callback',
          skipBrowserRedirect: true,
        },
      });
    });

    it('uses Linking.createURL for native platform in OAuth', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      supabase.auth.signInWithOAuth.mockResolvedValueOnce({
        data: { url: null },
        error: null,
      });

      await signInWithOAuth('google');

      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'myapp://auth-callback',
          skipBrowserRedirect: true,
        },
      });
    });

    it('uses window.location.origin for web platform in password reset', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { origin: 'https://app.example.com' },
      });
      supabase.auth.resetPasswordForEmail.mockResolvedValueOnce({ error: null });

      await sendPasswordReset('test@example.com');

      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com', {
        redirectTo: 'https://app.example.com/auth-callback',
      });
    });

    it('uses Linking.createURL for native platform in password reset', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });
      supabase.auth.resetPasswordForEmail.mockResolvedValueOnce({ error: null });

      await sendPasswordReset('test@example.com');

      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com', {
        redirectTo: 'myapp://auth-callback',
      });
    });

    it('uses localhost fallback when window is undefined on web', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
      const originalWindow = global.window;
      const originalEnv = process.env.EXPO_PUBLIC_APP_DOMAIN;
      // @ts-expect-error - testing undefined window
      delete global.window;
      delete process.env.EXPO_PUBLIC_APP_DOMAIN;

      supabase.auth.signUp.mockResolvedValueOnce({ error: null });
      await signUpWithEmail('test@example.com', 'password');

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
        options: {
          emailRedirectTo: 'http://localhost:8081/auth-callback',
        },
      });

      global.window = originalWindow;
      process.env.EXPO_PUBLIC_APP_DOMAIN = originalEnv;
    });

    it('uses EXPO_PUBLIC_APP_DOMAIN when set on web with undefined window', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
      const originalWindow = global.window;
      const originalEnv = process.env.EXPO_PUBLIC_APP_DOMAIN;
      // @ts-expect-error - testing undefined window
      delete global.window;
      process.env.EXPO_PUBLIC_APP_DOMAIN = 'betterhabits.com';

      supabase.auth.signUp.mockResolvedValueOnce({ error: null });
      await signUpWithEmail('test@example.com', 'password');

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
        options: {
          emailRedirectTo: 'https://betterhabits.com/auth-callback',
        },
      });

      global.window = originalWindow;
      process.env.EXPO_PUBLIC_APP_DOMAIN = originalEnv;
    });

    it('uses EXPO_PUBLIC_APP_DOMAIN for native when set', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      const originalEnv = process.env.EXPO_PUBLIC_APP_DOMAIN;
      process.env.EXPO_PUBLIC_APP_DOMAIN = 'betterhabits.com';

      supabase.auth.signUp.mockResolvedValueOnce({ error: null });
      await signUpWithEmail('test@example.com', 'password');

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
        options: {
          emailRedirectTo: 'https://betterhabits.com/auth-callback',
        },
      });

      process.env.EXPO_PUBLIC_APP_DOMAIN = originalEnv;
    });

    it('uses localhost for password reset when window is undefined on web', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
      const originalWindow = global.window;
      const originalEnv = process.env.EXPO_PUBLIC_APP_DOMAIN;
      // @ts-expect-error - testing undefined window
      delete global.window;
      delete process.env.EXPO_PUBLIC_APP_DOMAIN;

      supabase.auth.resetPasswordForEmail.mockResolvedValueOnce({ error: null });
      await sendPasswordReset('test@example.com');

      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com', {
        redirectTo: 'http://localhost:8081/auth-callback',
      });

      global.window = originalWindow;
      process.env.EXPO_PUBLIC_APP_DOMAIN = originalEnv;
    });

    it('uses full URL with protocol when set on web with undefined window', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
      const originalWindow = global.window;
      const originalEnv = process.env.EXPO_PUBLIC_APP_DOMAIN;
      // @ts-expect-error - testing undefined window
      delete global.window;
      process.env.EXPO_PUBLIC_APP_DOMAIN = 'http://localhost:8081';

      supabase.auth.signUp.mockResolvedValueOnce({ error: null });
      await signUpWithEmail('test@example.com', 'password');

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
        options: {
          emailRedirectTo: 'http://localhost:8081/auth-callback',
        },
      });

      global.window = originalWindow;
      process.env.EXPO_PUBLIC_APP_DOMAIN = originalEnv;
    });

    it('strips protocol for native when full URL is provided', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      const originalEnv = process.env.EXPO_PUBLIC_APP_DOMAIN;
      process.env.EXPO_PUBLIC_APP_DOMAIN = 'http://localhost:8081';

      supabase.auth.signUp.mockResolvedValueOnce({ error: null });
      await signUpWithEmail('test@example.com', 'password');

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
        options: {
          emailRedirectTo: 'https://localhost:8081/auth-callback',
        },
      });

      process.env.EXPO_PUBLIC_APP_DOMAIN = originalEnv;
    });
  });
});
