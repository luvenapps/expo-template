import type { Provider } from '@supabase/supabase-js';
import { resolveFriendlyError } from '@/errors/friendly';
import { supabase } from './client';

export type AuthResult = {
  success: boolean;
  error?: string;
  code?: string;
};

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const friendly = resolveFriendlyError(error);
    return {
      success: false,
      error: friendly.description ?? friendly.title,
      code: friendly.code,
    };
  }
  return { success: true };
}

export async function signInWithOAuth(provider: Provider): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithOAuth({ provider });
  if (error) {
    const friendly = resolveFriendlyError(error);
    return {
      success: false,
      error: friendly.description ?? friendly.title,
      code: friendly.code,
    };
  }
  return { success: true };
}

export async function signOut(): Promise<AuthResult> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    const friendly = resolveFriendlyError(error);
    return {
      success: false,
      error: friendly.description ?? friendly.title,
      code: friendly.code,
    };
  }
  return { success: true };
}
