import type { Provider } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { resolveFriendlyError, type FriendlyError } from '@/errors/friendly';
import { supabase } from './client';

export type AuthResult = {
  success: boolean;
  error?: string;
  code?: string;
  friendlyError?: FriendlyError;
};

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const friendly = resolveFriendlyError(error);
    return {
      success: false,
      error: friendly.description ?? friendly.title,
      code: friendly.code,
      friendlyError: friendly,
    };
  }
  return { success: true };
}

type WebBrowserModule = {
  openAuthSessionAsync?: (url: string, redirectUrl?: string, options?: unknown) => Promise<unknown>;
};

function getWebBrowserModule() {
  return requireOptionalNativeModule<WebBrowserModule>('ExpoWebBrowser');
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
      friendlyError: friendly,
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

  const webBrowser = getWebBrowserModule();
  const openAuthSession = webBrowser?.openAuthSessionAsync;

  if (!openAuthSession) {
    await Linking.openURL(authUrl);
    return { success: true };
  }

  try {
    await openAuthSession(authUrl, redirectTo, {});
    return { success: true };
  } catch (browserError) {
    const message =
      browserError instanceof Error ? browserError.message : 'Unable to open sign-in window';
    return {
      success: false,
      error: message,
      code: 'auth.oauth.browser',
      friendlyError: {
        title: 'Unable to open sign-in window',
        description: message,
        code: 'auth.oauth.browser',
        type: 'error',
      },
    };
  }
}

export async function signOut(): Promise<AuthResult> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    const friendly = resolveFriendlyError(error);
    return {
      success: false,
      error: friendly.description ?? friendly.title,
      code: friendly.code,
      friendlyError: friendly,
    };
  }
  return { success: true };
}

export async function signUpWithEmail(email: string, password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    const friendly = resolveFriendlyError(error);
    return {
      success: false,
      error: friendly.description ?? friendly.title,
      code: friendly.code,
      friendlyError: friendly,
    };
  }
  return { success: true };
}

export async function sendPasswordReset(email: string): Promise<AuthResult> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: Linking.createURL('auth/callback'),
  });
  if (error) {
    const friendly = resolveFriendlyError(error);
    return {
      success: false,
      error: friendly.description ?? friendly.title,
      code: friendly.code,
      friendlyError: friendly,
    };
  }
  return { success: true };
}
