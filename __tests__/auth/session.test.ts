// Mock supabase client before imports
jest.mock('@/auth/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  },
}));

import { beforeEach, describe, expect, test } from '@jest/globals';
import { useSessionStore, resetSessionStore } from '@/auth/session';

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
});
