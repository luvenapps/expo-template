jest.mock('@/auth/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signInWithOAuth: jest.fn(),
      signOut: jest.fn(),
      signUp: jest.fn(),
      resetPasswordForEmail: jest.fn(),
    },
  },
}));

jest.mock('@/errors/friendly', () => ({
  resolveFriendlyError: jest.fn((error: any) => ({
    title: error.message || 'Unexpected error',
    description: error.message || 'Unexpected error',
    code: 'unknown',
    type: 'error',
  })),
}));

type SupabaseAuth = (typeof import('@/auth/client'))['supabase']['auth'];

const auth = require('@/auth/client').supabase.auth as SupabaseAuth;
const ExpoLinking = require('expo-linking');
const ExpoModulesCore = require('expo-modules-core');
const mockRequireOptionalNativeModule = ExpoModulesCore.requireOptionalNativeModule as jest.Mock;
const mockOpenAuthSessionAsync = ExpoModulesCore.__openAuthSessionAsyncMock as jest.Mock;

import { Platform } from 'react-native';
import {
  signInWithEmail,
  signInWithOAuth,
  signOut,
  signUpWithEmail,
  sendPasswordReset,
} from '@/auth/service';

jest.mock('expo-linking', () => ({
  createURL: jest.fn(() => 'betterhabits://auth/callback'),
  openURL: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-modules-core', () => {
  const openAuthSessionAsync = jest.fn(() => Promise.resolve({ type: 'success' }));
  const requireOptionalNativeModule = jest.fn(() => ({
    openAuthSessionAsync,
  }));
  return {
    requireOptionalNativeModule,
    __openAuthSessionAsyncMock: openAuthSessionAsync,
  };
});

const mockReturn = (method: keyof SupabaseAuth, opts: { error?: string; url?: string } = {}) => {
  const payload: any = { error: opts.error ? { message: opts.error } : null };
  if (method === 'signInWithOAuth') {
    payload.data =
      opts.url === undefined ? { url: 'https://example.com' } : opts.url ? { url: opts.url } : null;
  }
  (auth[method] as jest.Mock).mockResolvedValueOnce(payload);
};

describe('auth/service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { value: 'ios' });
    mockOpenAuthSessionAsync.mockResolvedValue({ type: 'success' });
    mockRequireOptionalNativeModule.mockReturnValue({
      openAuthSessionAsync: mockOpenAuthSessionAsync,
    });
  });

  test('signInWithEmail returns success', async () => {
    mockReturn('signInWithPassword');
    const result = await signInWithEmail('user@example.com', 'password');
    expect(result).toEqual({ success: true });
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password',
    });
  });

  test('signInWithEmail returns error message', async () => {
    mockReturn('signInWithPassword', { error: 'Invalid credentials' });
    const result = await signInWithEmail('user@example.com', 'password');
    expect(result).toEqual({
      success: false,
      error: 'Invalid credentials',
      code: 'unknown',
      friendlyError: {
        title: 'Invalid credentials',
        description: 'Invalid credentials',
        code: 'unknown',
        type: 'error',
      },
    });
  });

  test('signOut returns success', async () => {
    mockReturn('signOut');
    const result = await signOut();
    expect(result).toEqual({ success: true });
    expect(auth.signOut).toHaveBeenCalled();
  });

  test('signOut handles errors', async () => {
    mockReturn('signOut', { error: 'Failed' });
    const result = await signOut();
    expect(result).toEqual({
      success: false,
      error: 'Failed',
      code: 'unknown',
      friendlyError: {
        title: 'Failed',
        description: 'Failed',
        code: 'unknown',
        type: 'error',
      },
    });
  });

  test('signInWithOAuth succeeds', async () => {
    mockReturn('signInWithOAuth');
    const result = await signInWithOAuth('github');
    expect(result).toEqual({ success: true });
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'github',
      options: expect.objectContaining({ skipBrowserRedirect: true }),
    });
    expect(mockOpenAuthSessionAsync).toHaveBeenCalledWith(
      'https://example.com',
      'betterhabits://auth/callback',
      {},
    );
  });

  test('signInWithOAuth returns error message', async () => {
    mockReturn('signInWithOAuth', { error: 'OAuth failed' });
    const result = await signInWithOAuth('google');
    expect(result).toEqual({
      success: false,
      error: 'OAuth failed',
      code: 'unknown',
      friendlyError: {
        title: 'OAuth failed',
        description: 'OAuth failed',
        code: 'unknown',
        type: 'error',
      },
    });
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: expect.any(Object),
    });
  });

  test('signInWithOAuth propagates browser errors', async () => {
    mockReturn('signInWithOAuth');
    mockOpenAuthSessionAsync.mockRejectedValueOnce(new Error('Failed to open browser'));
    const result = await signInWithOAuth('google');
    expect(result).toEqual({
      success: false,
      error: 'Failed to open browser',
      code: 'auth.oauth.browser',
      friendlyError: {
        title: 'Unable to open sign-in window',
        description: 'Failed to open browser',
        code: 'auth.oauth.browser',
        type: 'error',
      },
    });
  });

  test('signInWithOAuth falls back to Linking when AuthSession is unavailable', async () => {
    mockReturn('signInWithOAuth');
    mockRequireOptionalNativeModule.mockReturnValueOnce(null);
    const result = await signInWithOAuth('google');
    expect(result).toEqual({ success: true });
    expect(ExpoLinking.openURL).toHaveBeenCalledWith('https://example.com');
  });

  test('signInWithOAuth returns success when authUrl is null', async () => {
    mockReturn('signInWithOAuth', { url: '' });
    const result = await signInWithOAuth('google');
    expect(result).toEqual({ success: true });
    expect(mockOpenAuthSessionAsync).not.toHaveBeenCalled();
    expect(ExpoLinking.openURL).not.toHaveBeenCalled();
  });

  test('signInWithOAuth uses window.location.assign on web platform', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    const mockAssign = jest.fn();
    Object.defineProperty(global, 'window', {
      value: { location: { assign: mockAssign } },
      writable: true,
      configurable: true,
    });

    mockReturn('signInWithOAuth');
    const result = await signInWithOAuth('google');

    expect(result).toEqual({ success: true });
    expect(mockAssign).toHaveBeenCalledWith('https://example.com');
    expect(mockOpenAuthSessionAsync).not.toHaveBeenCalled();
  });

  test('signUpWithEmail returns success', async () => {
    mockReturn('signUp');
    const result = await signUpWithEmail('new@example.com', 'password123');
    expect(result).toEqual({ success: true });
    expect(auth.signUp).toHaveBeenCalledWith({ email: 'new@example.com', password: 'password123' });
  });

  test('signUpWithEmail handles errors', async () => {
    mockReturn('signUp', { error: 'Email taken' });
    const result = await signUpWithEmail('new@example.com', 'password123');
    expect(result).toEqual({
      success: false,
      error: 'Email taken',
      code: 'unknown',
      friendlyError: {
        title: 'Email taken',
        description: 'Email taken',
        code: 'unknown',
        type: 'error',
      },
    });
  });

  test('sendPasswordReset returns success', async () => {
    mockReturn('resetPasswordForEmail');
    const result = await sendPasswordReset('user@example.com');
    expect(result).toEqual({ success: true });
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('user@example.com', {
      redirectTo: 'betterhabits://auth/callback',
    });
  });

  test('sendPasswordReset handles errors', async () => {
    mockReturn('resetPasswordForEmail', { error: 'No user' });
    const result = await sendPasswordReset('user@example.com');
    expect(result).toEqual({
      success: false,
      error: 'No user',
      code: 'unknown',
      friendlyError: {
        title: 'No user',
        description: 'No user',
        code: 'unknown',
        type: 'error',
      },
    });
  });
});
