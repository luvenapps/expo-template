import { resolveFriendlyError, type FriendlyError } from '@/errors/friendly';
import type { Provider } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '@/observability/logger';
import { analytics } from '@/observability/analytics';
import { supabase } from './client';

export type AuthResult = {
  success: boolean;
  error?: string;
  code?: string;
  friendlyError?: FriendlyError;
};

const logger = createLogger('Auth');

type AuthMethod = 'email' | 'google' | 'apple' | 'oauth' | 'session';

function trackAuthEvent(
  event: 'auth:sign_in' | 'auth:sign_up' | 'auth:forgot_password' | 'auth:sign_out',
  method: AuthMethod,
  status: 'success' | 'error',
  code?: string,
) {
  analytics.trackEvent(event, {
    method,
    status,
    code,
    platform: Platform.OS,
  });
}

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
    trackAuthEvent('auth:sign_in', 'email', 'error', friendly.code);
    return {
      success: false,
      error: errorMessage,
      code: friendly.code,
      friendlyError: friendly,
    };
  }
  trackAuthEvent('auth:sign_in', 'email', 'success');
  return { success: true };
}

function parseOAuthRedirect(url: string) {
  const parsed = Linking.parse(url);
  const code =
    parsed.queryParams && typeof parsed.queryParams.code === 'string'
      ? parsed.queryParams.code
      : undefined;
  const hash = url.split('#')[1] ?? '';
  const hashParams = new URLSearchParams(hash);
  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');

  return { code, accessToken, refreshToken };
}

async function resolveOAuthSession(url: string, provider: Provider): Promise<AuthResult> {
  const { code, accessToken, refreshToken } = parseOAuthRedirect(url);
  const method: AuthMethod =
    provider === 'google' ? 'google' : provider === 'apple' ? 'apple' : 'oauth';

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(url);
    if (error) {
      const friendly = resolveFriendlyError(error);
      trackAuthEvent('auth:sign_in', method, 'error', friendly.code);
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
    trackAuthEvent('auth:sign_in', method, 'success');
    return { success: true };
  }

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      const friendly = resolveFriendlyError(error);
      trackAuthEvent('auth:sign_in', method, 'error', friendly.code);
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

    trackAuthEvent('auth:sign_in', method, 'success');
    return { success: true };
  }

  const friendly = resolveFriendlyError(new Error('OAuth redirect missing tokens'));
  trackAuthEvent('auth:sign_in', method, 'error', friendly.code);
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

    logger.info('Apple sign-in credential received', {
      hasIdentityToken: Boolean(credential.identityToken),
      hasAuthorizationCode: Boolean(credential.authorizationCode),
      hasEmail: Boolean(credential.email),
      hasFullName: Boolean(credential.fullName),
      user: credential.user ? 'present' : 'missing',
      realUserStatus: credential.realUserStatus,
    });

    if (!credential.identityToken) {
      logger.error('Apple sign-in failed: missing identity token');
      const friendly = resolveFriendlyError(new Error('Missing Apple identity token'));
      trackAuthEvent('auth:sign_in', 'apple', 'error', friendly.code);
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
      logger.error('Apple sign-in failed during Supabase exchange', errorDetails);
      const friendly = resolveFriendlyError(error);
      trackAuthEvent('auth:sign_in', 'apple', 'error', friendly.code);
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

    trackAuthEvent('auth:sign_in', 'apple', 'success');
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

    logger.error('Apple sign-in failed', details);
    const friendly = resolveFriendlyError(error);
    trackAuthEvent('auth:sign_in', 'apple', 'error', friendly.code);
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
  const method: AuthMethod =
    provider === 'google' ? 'google' : provider === 'apple' ? 'apple' : 'oauth';
  if (provider === 'apple' && Platform.OS === 'ios') {
    const isAvailable = await AppleAuthentication.isAvailableAsync().catch((error) => {
      logger.error('Apple sign-in availability check failed', {
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    });
    logger.info('Apple sign-in available', { isAvailable });
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
    trackAuthEvent('auth:sign_in', method, 'error', friendly.code);
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

  logger.info('OAuth redirect URL', { redirectTo });
  logger.info('OAuth auth URL', { authUrl });

  const openAuthSession = WebBrowser.openAuthSessionAsync;

  if (!openAuthSession) {
    logger.info('OAuth browser session unavailable, falling back to Linking', {
      platform: Platform.OS,
    });
    await Linking.openURL(authUrl);
    return { success: true };
  }

  try {
    logger.info('OAuth browser session available', { platform: Platform.OS });
    const result = await openAuthSession(authUrl, redirectTo, {});
    logger.info('OAuth browser result', result);
    if (result && typeof result === 'object' && 'type' in result) {
      if (result.type === 'success' && 'url' in result && typeof result.url === 'string') {
        return await resolveOAuthSession(result.url, provider);
      }

      const friendly = resolveFriendlyError(new Error('OAuth cancelled or missing redirect'));
      trackAuthEvent('auth:sign_in', method, 'error', friendly.code);
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
  } catch (browserError) {
    const message =
      browserError instanceof Error ? browserError.message : 'Unable to open sign-in window';
    trackAuthEvent('auth:sign_in', method, 'error', 'auth.oauth.browser');
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
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  const status = error && typeof error === 'object' && 'status' in error ? error.status : undefined;
  if (status === 401 || status === 403 || status === 404) {
    trackAuthEvent('auth:sign_out', 'session', 'success');
    return { success: true };
  }
  if (error) {
    const friendly = resolveFriendlyError(error);
    const errorMessage =
      friendly.originalMessage ??
      friendly.description ??
      friendly.title ??
      friendly.descriptionKey ??
      friendly.titleKey;
    trackAuthEvent('auth:sign_out', 'session', 'error', friendly.code);
    return {
      success: false,
      error: errorMessage,
      code: friendly.code,
      friendlyError: friendly,
    };
  }
  trackAuthEvent('auth:sign_out', 'session', 'success');
  return { success: true };
}

export async function signUpWithEmail(
  email: string,
  password: string,
  metadata?: { fullName?: string; phoneNumber?: string },
): Promise<AuthResult> {
  const data =
    metadata && (metadata.fullName || metadata.phoneNumber)
      ? {
          full_name: metadata.fullName,
          phone_number: metadata.phoneNumber,
        }
      : undefined;
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: data ? { data } : undefined,
  });
  if (error) {
    const friendly = resolveFriendlyError(error);
    const errorMessage =
      friendly.originalMessage ??
      friendly.description ??
      friendly.title ??
      friendly.descriptionKey ??
      friendly.titleKey;
    trackAuthEvent('auth:sign_up', 'email', 'error', friendly.code);
    return {
      success: false,
      error: errorMessage,
      code: friendly.code,
      friendlyError: friendly,
    };
  }
  trackAuthEvent('auth:sign_up', 'email', 'success');
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
    trackAuthEvent('auth:forgot_password', 'email', 'error', friendly.code);
    return {
      success: false,
      error: errorMessage,
      code: friendly.code,
      friendlyError: friendly,
    };
  }
  trackAuthEvent('auth:forgot_password', 'email', 'success');
  return { success: true };
}
