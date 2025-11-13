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

import { signInWithEmail, signInWithOAuth, signOut } from '@/auth/service';

const mockReturn = (method: keyof SupabaseAuth, error?: string) => {
  (auth[method] as jest.Mock).mockResolvedValueOnce({ error: error ? { message: error } : null });
};

describe('auth/service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    mockReturn('signInWithPassword', 'Invalid credentials');
    const result = await signInWithEmail('user@example.com', 'password');
    expect(result).toEqual({ success: false, error: 'Invalid credentials', code: 'unknown' });
  });

  test('signOut handles errors', async () => {
    mockReturn('signOut', 'Failed');
    const result = await signOut();
    expect(result).toEqual({ success: false, error: 'Failed', code: 'unknown' });
  });

  test('signInWithOAuth succeeds', async () => {
    mockReturn('signInWithOAuth');
    const result = await signInWithOAuth('github');
    expect(result).toEqual({ success: true });
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({ provider: 'github' });
  });

  test('signInWithOAuth returns error message', async () => {
    mockReturn('signInWithOAuth', 'OAuth failed');
    const result = await signInWithOAuth('google');
    expect(result).toEqual({ success: false, error: 'OAuth failed', code: 'unknown' });
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({ provider: 'google' });
  });
});
