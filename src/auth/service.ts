import { resolveFriendlyError, type FriendlyError } from '@/errors/friendly';
import type { Provider } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';
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
    const errorMessage =
      friendly.originalMessage ??
      friendly.description ??
      friendly.title ??
      friendly.descriptionKey ??
      friendly.titleKey;
    return {
      success: false,
      error: errorMessage,
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
  const redirectTo =
    Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin
      ? new URL('/auth-callback', window.location.origin).toString()
      : Linking.createURL('auth-callback');

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
      error:
        friendly.originalMessage ??
        friendly.description ??
        friendly.title ??
        friendly.descriptionKey ??
        friendly.titleKey,
      code: friendly.code,
      friendlyError: friendly,
    };
  }

  const authUrl = data?.url;

  if (!authUrl) {
    return { success: true };
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    setTimeout(() => window?.location?.assign(authUrl), 0);
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
    const errorMessage =
      friendly.originalMessage ??
      friendly.description ??
      friendly.title ??
      friendly.descriptionKey ??
      friendly.titleKey;
    return {
      success: false,
      error: errorMessage,
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
    const errorMessage =
      friendly.originalMessage ??
      friendly.description ??
      friendly.title ??
      friendly.descriptionKey ??
      friendly.titleKey;
    return {
      success: false,
      error: errorMessage,
      code: friendly.code,
      friendlyError: friendly,
    };
  }
  return { success: true };
}

export async function sendPasswordReset(email: string): Promise<AuthResult> {
  const redirectTo =
    Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin
      ? new URL('/auth-callback', window.location.origin).toString()
      : Linking.createURL('auth-callback');
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) {
    const friendly = resolveFriendlyError(error);
    const errorMessage =
      friendly.originalMessage ??
      friendly.description ??
      friendly.title ??
      friendly.descriptionKey ??
      friendly.titleKey;
    return {
      success: false,
      error: errorMessage,
      code: friendly.code,
      friendlyError: friendly,
    };
  }
  return { success: true };
}
