import { create } from 'zustand';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase } from './client';
import { signInWithEmail, signOut as supabaseSignOut, type AuthResult } from './service';

type SupabaseSession = Session | null;

type SessionState = {
  session: SupabaseSession;
  status: 'unknown' | 'authenticated' | 'unauthenticated';
  isLoading: boolean;
  error: string | null;
  setSession: (session: SupabaseSession) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
  reset: () => void;
};

const baseState = {
  session: null as SupabaseSession,
  status: 'unknown' as SessionState['status'],
  isLoading: false,
  error: null as string | null,
};

export const useSessionStore = create<SessionState>((set) => ({
  ...baseState,
  setSession: (session) => set({ session, status: session ? 'authenticated' : 'unauthenticated' }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  signInWithEmail: async (email, password) => {
    set({ isLoading: true, error: null });
    const result = await signInWithEmail(email, password);
    if (!result.success && result.error) {
      set({ error: result.error, isLoading: false, status: 'unauthenticated' });
    } else {
      set({ isLoading: false });
    }
    return result;
  },
  signOut: async () => {
    set({ isLoading: true, error: null });
    const result = await supabaseSignOut();
    if (!result.success && result.error) {
      set({ error: result.error, isLoading: false });
    } else {
      set({ isLoading: false, session: null, status: 'unauthenticated' });
    }
    return result;
  },
  reset: () => set(baseState),
}));

type ListenCallback = (session: SessionState['session']) => void;

let listenerInitialized = false;

export const initSessionListener = async (callback?: ListenCallback) => {
  if (listenerInitialized) return;

  listenerInitialized = true;

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
    useSessionStore.getState().setSession(session);
    callback?.(session);
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();
  useSessionStore.getState().setSession(session);

  return subscription;
};

export const resetSessionStore = () => {
  useSessionStore.getState().reset();
  listenerInitialized = false;
};
