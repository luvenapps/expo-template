import { create } from 'zustand';
import type { AuthChangeEvent, Session, Provider } from '@supabase/supabase-js';
import { supabase } from './client';
import {
  signInWithEmail as supabaseSignInWithEmail,
  signInWithOAuth as supabaseSignInWithOAuth,
  signOut as supabaseSignOut,
  type AuthResult,
} from './service';

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
  signInWithOAuth: (provider: Provider) => Promise<AuthResult>;
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
    const result = await supabaseSignInWithEmail(email, password);
    if (!result.success && result.error) {
      set({ error: result.error, isLoading: false, status: 'unauthenticated' });
    } else {
      set({ isLoading: false });
    }
    return result;
  },
  signInWithOAuth: async (provider) => {
    set({ isLoading: true, error: null });
    const result = await supabaseSignInWithOAuth(provider);
    if (!result.success && result.error) {
      set({ error: result.error, isLoading: false });
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
      // Explicitly check the session to ensure UI updates
      const {
        data: { session },
      } = await supabase.auth.getSession();
      set({ isLoading: false, session, status: session ? 'authenticated' : 'unauthenticated' });
    }
    return result;
  },
  reset: () => set(baseState),
}));

type ListenCallback = (session: SessionState['session']) => void;

let listenerInitialized = false;
let listenerInitializationPromise: Promise<unknown> | null = null;

export const initSessionListener = async (callback?: ListenCallback) => {
  if (listenerInitialized) return;
  if (listenerInitializationPromise) return listenerInitializationPromise;

  listenerInitializationPromise = (async () => {
    try {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
        useSessionStore.getState().setSession(session);
        callback?.(session);
      });

      listenerInitialized = true;

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        useSessionStore.getState().setSession(session);
      } catch {
        // Never leave the UI blocked in "unknown" state if an initial session read aborts.
        useSessionStore.getState().setSession(null);
      }

      return subscription;
    } catch {
      listenerInitialized = false;
      useSessionStore.getState().setSession(null);
      return undefined;
    } finally {
      listenerInitializationPromise = null;
    }
  })();

  return listenerInitializationPromise;
};

export const resetSessionStore = () => {
  useSessionStore.getState().reset();
  listenerInitialized = false;
};
