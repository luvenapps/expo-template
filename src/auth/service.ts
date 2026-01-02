import { resolveFriendlyError, type FriendlyError } from '@/errors/friendly';
import type { Provider } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
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

async function signInWithAppleNative(): Promise<AuthResult> {
  try {
    const rawNonce = uuidv4();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce,
    );

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      ],
      nonce: hashedNonce,
    });

    console.info('[Auth] Apple sign-in credential received', {
      hasIdentityToken: Boolean(credential.identityToken),
      hasAuthorizationCode: Boolean(credential.authorizationCode),
      hasEmail: Boolean(credential.email),
      hasFullName: Boolean(credential.fullName),
      user: credential.user ? 'present' : 'missing',
      realUserStatus: credential.realUserStatus,
    });

    if (!credential.identityToken) {
      console.error('[Auth] Apple sign-in failed: missing identity token');
      const friendly = resolveFriendlyError(new Error('Missing Apple identity token'));
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

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce: rawNonce,
    });

    if (error) {
      const errorDetails = {
        message: error.message,
        name: 'name' in error ? (error as { name?: string }).name : undefined,
        status: 'status' in error ? (error as { status?: number }).status : undefined,
        code: 'code' in error ? (error as { code?: string }).code : undefined,
      };
      console.error('[Auth] Apple sign-in failed during Supabase exchange', errorDetails);
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

    return { success: true };
  } catch (error) {
    const details =
      error instanceof Error
        ? { message: error.message, name: error.name }
        : { message: 'Unknown error', name: undefined };

    if (error && typeof error === 'object') {
      if ('code' in error) {
        (details as { code?: string }).code = (error as { code?: string }).code;
      }
      if ('domain' in error) {
        (details as { domain?: string }).domain = (error as { domain?: string }).domain;
      }
    }

    console.error('[Auth] Apple sign-in failed', details);
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
}

export async function signInWithOAuth(provider: Provider): Promise<AuthResult> {
  if (provider === 'apple' && Platform.OS === 'ios') {
    const isAvailable = await AppleAuthentication.isAvailableAsync().catch((error) => {
      console.error('[Auth] Apple sign-in availability check failed', {
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    });
    console.info('[Auth] Apple sign-in available', { isAvailable });
    if (isAvailable) {
      return await signInWithAppleNative();
    }
  }

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
