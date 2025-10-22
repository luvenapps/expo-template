import type { Provider } from '@supabase/supabase-js';
import { supabase } from './client';

export type AuthResult = {
  success: boolean;
  error?: string;
};

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? { success: false, error: error.message } : { success: true };
}

export async function signInWithOAuth(provider: Provider): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithOAuth({ provider });
  return error ? { success: false, error: error.message } : { success: true };
}

export async function signOut(): Promise<AuthResult> {
  const { error } = await supabase.auth.signOut();
  return error ? { success: false, error: error.message } : { success: true };
}
