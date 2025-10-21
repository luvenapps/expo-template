import { create } from 'zustand';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase } from './client';

type SupabaseSession = Session | null;

type SessionState = {
  session: SupabaseSession;
  status: 'unknown' | 'authenticated' | 'unauthenticated';
  setSession: (session: SupabaseSession) => void;
  reset: () => void;
};

const baseState = {
  session: null as SupabaseSession,
  status: 'unknown' as SessionState['status'],
};

export const useSessionStore = create<SessionState>((set) => ({
  ...baseState,
  setSession: (session) => set({ session, status: session ? 'authenticated' : 'unauthenticated' }),
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
