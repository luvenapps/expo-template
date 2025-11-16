jest.mock('@/auth/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signInWithOAuth: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

jest.mock('@/errors/friendly', () => ({
  resolveFriendlyError: jest.fn((error: any) => ({
    title: error.message || 'Unexpected error',
    description: error.message || 'Unexpected error',
    code: 'unknown',
  })),
}));

type SupabaseAuth = (typeof import('@/auth/client'))['supabase']['auth'];

const auth = require('@/auth/client').supabase.auth as SupabaseAuth;
const ExpoLinking = require('expo-linking');

import { Platform } from 'react-native';
import { signInWithEmail, signInWithOAuth, signOut } from '@/auth/service';

jest.mock('expo-linking', () => ({
  createURL: jest.fn(() => 'betterhabits://auth/callback'),
  openURL: jest.fn(() => Promise.resolve()),
}));

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
      },
    });
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
    expect(ExpoLinking.openURL).toHaveBeenCalled();
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
      },
    });
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: expect.any(Object),
    });
  });
});
