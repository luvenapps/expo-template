// Mock supabase client before imports
const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();

jest.mock('@/auth/client', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
  },
}));

// Mock auth service functions
const mockSignInWithEmail = jest.fn();
const mockSignOut = jest.fn();

jest.mock('@/auth/service', () => ({
  signInWithEmail: (...args: any[]) => mockSignInWithEmail(...args),
  signOut: (...args: any[]) => mockSignOut(...args),
}));

import { resetSessionStore, useSessionStore } from '@/auth/session';
import { beforeEach, describe, expect, test } from '@jest/globals';

// Create a mock session type for testing
type MockSession = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  user: {
    id: string;
    email: string;
  };
};

const mockSession: MockSession = {
  access_token: 'mock-token',
  token_type: 'bearer',
  expires_in: 3600,
  refresh_token: 'mock-refresh',
  user: {
    id: 'user-123',
    email: 'test@example.com',
  },
};

describe('session store', () => {
  beforeEach(() => {
    mockSignInWithEmail.mockClear();
    mockSignOut.mockClear();
    resetSessionStore();
  });

  test('initializes with unknown status', () => {
    const state = useSessionStore.getState();
    expect(state.status).toBe('unknown');
    expect(state.session).toBeNull();
  });

  test('setSession updates session and status to authenticated', () => {
    const { setSession } = useSessionStore.getState();
    setSession(mockSession as any);

    const state = useSessionStore.getState();
    expect(state.session).toEqual(mockSession);
    expect(state.status).toBe('authenticated');
  });

  test('setSession updates status to unauthenticated when session is null', () => {
    const { setSession } = useSessionStore.getState();
    setSession(null);

    const state = useSessionStore.getState();
    expect(state.session).toBeNull();
    expect(state.status).toBe('unauthenticated');
  });

  test('reset returns store to initial state', () => {
    const { setSession, reset } = useSessionStore.getState();
    setSession(mockSession as any);

    reset();

    const state = useSessionStore.getState();
    expect(state.session).toBeNull();
    expect(state.status).toBe('unknown');
  });

  test('resetSessionStore helper resets the store', () => {
    const { setSession } = useSessionStore.getState();
    setSession(mockSession as any);

    resetSessionStore();

    const state = useSessionStore.getState();
    expect(state.session).toBeNull();
    expect(state.status).toBe('unknown');
  });

  test('setSession transitions from authenticated to unauthenticated', () => {
    const { setSession } = useSessionStore.getState();

    // First set a session
    setSession(mockSession as any);
    expect(useSessionStore.getState().status).toBe('authenticated');

    // Then clear it
    setSession(null);
    expect(useSessionStore.getState().status).toBe('unauthenticated');
    expect(useSessionStore.getState().session).toBeNull();
  });

  test('multiple setSession calls update state correctly', () => {
    const { setSession } = useSessionStore.getState();

    const session1 = { ...mockSession, access_token: 'token1' };
    const session2 = { ...mockSession, access_token: 'token2' };

    setSession(session1 as any);
    expect(useSessionStore.getState().session).toEqual(session1);

    setSession(session2 as any);
    expect(useSessionStore.getState().session).toEqual(session2);
    expect(useSessionStore.getState().status).toBe('authenticated');
  });

  test('setLoading updates loading state', () => {
    const { setLoading } = useSessionStore.getState();

    setLoading(true);
    expect(useSessionStore.getState().isLoading).toBe(true);

    setLoading(false);
    expect(useSessionStore.getState().isLoading).toBe(false);
  });

  test('setError updates error state', () => {
    const { setError } = useSessionStore.getState();

    setError('Something went wrong');
    expect(useSessionStore.getState().error).toBe('Something went wrong');

    setError(null);
    expect(useSessionStore.getState().error).toBeNull();
  });

  test('signInWithEmail handles successful login', async () => {
    mockSignInWithEmail.mockResolvedValue({ success: true });

    const { signInWithEmail } = useSessionStore.getState();
    const result = await signInWithEmail('test@example.com', 'password');

    expect(mockSignInWithEmail).toHaveBeenCalledWith('test@example.com', 'password');
    expect(result.success).toBe(true);
    expect(useSessionStore.getState().isLoading).toBe(false);
  });

  test('signInWithEmail handles failed login', async () => {
    mockSignInWithEmail.mockResolvedValue({
      success: false,
      error: 'Invalid credentials',
    });

    const { signInWithEmail } = useSessionStore.getState();
    const result = await signInWithEmail('test@example.com', 'wrong');

    expect(mockSignInWithEmail).toHaveBeenCalledWith('test@example.com', 'wrong');
    expect(result.success).toBe(false);
    expect(useSessionStore.getState().error).toBe('Invalid credentials');
    expect(useSessionStore.getState().status).toBe('unauthenticated');
    expect(useSessionStore.getState().isLoading).toBe(false);
  });

  test('signOut handles successful logout', async () => {
    mockSignOut.mockResolvedValue({ success: true });

    const { signOut, setSession } = useSessionStore.getState();

    // Set a session first
    setSession(mockSession as any);
    expect(useSessionStore.getState().status).toBe('authenticated');

    const result = await signOut();

    expect(mockSignOut).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(useSessionStore.getState().session).toBeNull();
    expect(useSessionStore.getState().status).toBe('unauthenticated');
    expect(useSessionStore.getState().isLoading).toBe(false);
  });

  test('signOut handles failed logout', async () => {
    mockSignOut.mockResolvedValue({
      success: false,
      error: 'Logout failed',
    });

    const { signOut } = useSessionStore.getState();
    const result = await signOut();

    expect(mockSignOut).toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(useSessionStore.getState().error).toBe('Logout failed');
    expect(useSessionStore.getState().isLoading).toBe(false);
  });
});
