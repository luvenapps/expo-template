import type { Provider } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
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
  const redirectTo = Linking.createURL('auth/callback');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    const friendly = resolveFriendlyError(error);
    return {
      success: false,
      error: friendly.description ?? friendly.title,
      code: friendly.code,
    };
  }

  const authUrl = data?.url;

  if (!authUrl) {
    return { success: true };
  }

  if (Platform.OS === 'web') {
    window.location.assign(authUrl);
    return { success: true };
  }

  await Linking.openURL(authUrl);
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
