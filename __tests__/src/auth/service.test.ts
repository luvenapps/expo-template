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
}));

jest.mock('expo-modules-core', () => ({
  requireOptionalNativeModule: jest.fn(() => undefined),
}));

describe('auth/service', () => {
  const originalOS = Platform.OS;
  const originalLocation = window.location;
  const supabase = require('@/auth/client').supabase as any;
  const resolveFriendlyError = require('@/errors/friendly').resolveFriendlyError as jest.Mock;
  const requireOptionalNativeModule = require('expo-modules-core')
    .requireOptionalNativeModule as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { value: originalOS });
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
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
    Object.defineProperty(Platform, 'OS', { value: 'web' });
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
    Object.defineProperty(Platform, 'OS', { value: 'ios' });
    requireOptionalNativeModule.mockReturnValueOnce({});
    supabase.auth.signInWithOAuth.mockResolvedValueOnce({
      data: { url: 'https://example.com' },
      error: null,
    });
    const result = await signInWithOAuth('apple');
    expect(result.success).toBe(true);
    expect(Linking.openURL).toHaveBeenCalledWith('https://example.com');
  });

  it('calls openAuthSessionAsync when available', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' });
    const openAuthSessionAsync = jest.fn(() => Promise.resolve());
    requireOptionalNativeModule.mockReturnValueOnce({ openAuthSessionAsync });
    supabase.auth.signInWithOAuth.mockResolvedValueOnce({
      data: { url: 'https://example.com' },
      error: null,
    });
    const result = await signInWithOAuth('apple');
    expect(result.success).toBe(true);
    expect(openAuthSessionAsync).toHaveBeenCalled();
  });

  it('handles openAuthSessionAsync failure', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' });
    const openAuthSessionAsync = jest.fn(() => Promise.reject(new Error('browser fail')));
    requireOptionalNativeModule.mockReturnValueOnce({ openAuthSessionAsync });
    supabase.auth.signInWithOAuth.mockResolvedValueOnce({
      data: { url: 'https://example.com' },
      error: null,
    });
    const result = await signInWithOAuth('apple');
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
});
