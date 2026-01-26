import { supabase } from '@/auth/client';
import { useFriendlyErrorHandler } from '@/errors/useFriendlyErrorHandler';
import { analytics } from '@/observability/analytics';
import { createLogger } from '@/observability/logger';
import { InlineError, PrimaryButton, ScreenContainer, TitleText } from '@/ui';
import * as Linking from 'expo-linking';
import { useURL } from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';
import { Spinner, XStack, YStack } from 'tamagui';

export default function AuthCallbackScreen() {
  const logger = useMemo(() => createLogger('AuthCallback'), []);
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useTranslation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const handleFriendlyError = useFriendlyErrorHandler();
  const webHashRef = useRef<string | null>(null);
  const hasProcessedRef = useRef(false);
  const isProcessingRef = useRef(false);
  const hasLoggedSignInRef = useRef(false);
  const latestUrl = useURL();

  // Log component mount to verify it's rendering
  useEffect(() => {
    logger.info('AuthCallback screen mounted', {
      platform: Platform.OS,
      hasLatestUrl: Boolean(latestUrl),
      latestUrl,
      params,
    });
  }, [logger, latestUrl, params]);
  const goBackOrHome = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }, [router]);

  const queryParams = useMemo(() => {
    const entries = Object.entries(params).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : (value ?? ''),
    ]);
    return Object.fromEntries(entries) as Record<string, string>;
  }, [params]);

  const reportError = useCallback(
    (error: unknown) => {
      const { friendly } = handleFriendlyError(error, {
        surface: 'auth.callback',
        suppressToast: true,
      });

      const message =
        friendly.description ??
        (friendly.descriptionKey ? t(friendly.descriptionKey) : undefined) ??
        friendly.title ??
        (friendly.titleKey ? t(friendly.titleKey) : t('errors.unknown.description'));

      setErrorMessage(message);
    },
    [handleFriendlyError, t],
  );

  const trackAuthSignIn = useCallback((method: 'oauth' | 'session') => {
    if (hasLoggedSignInRef.current) {
      return;
    }
    hasLoggedSignInRef.current = true;
    analytics.trackEvent('auth:sign_in', {
      method,
      status: 'success',
      platform: Platform.OS,
    });
    analytics.trackEvent('login', {
      method,
      status: 'success',
      platform: Platform.OS,
    });
  }, []);

  const redirectWebHome = useCallback(async () => {
    if (typeof window === 'undefined') {
      return;
    }

    // Small delay so analytics events can flush before navigation.
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (typeof window.location?.replace === 'function') {
      window.location.replace('/(tabs)');
    }
  }, []);

  const handleWebCallback = useCallback(async () => {
    if (typeof window === 'undefined' || hasProcessedRef.current) {
      return;
    }

    setErrorMessage(null);
    hasProcessedRef.current = true;

    if (webHashRef.current === null) {
      webHashRef.current = window.location.hash ?? '';
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    const hashParams = new URLSearchParams(webHashRef.current.replace(/^#/, ''));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const errorCode = hashParams.get('error');
    const errorDescription = hashParams.get('error_description');
    const hasHashParams = Array.from(hashParams.keys()).length > 0;

    // Handle Supabase error responses
    if (errorCode) {
      reportError({
        code: errorCode,
        message: errorDescription
          ? decodeURIComponent(errorDescription.replace(/\+/g, ' '))
          : undefined,
        type: 'error',
      });
      return;
    }

    if (!accessToken || !refreshToken) {
      if (!hasHashParams) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          trackAuthSignIn('session');
          // Email confirmation successful - redirect to home
          await redirectWebHome();
          return;
        }
        return;
      }
      reportError({
        code: 'auth.oauth.browser',
        titleKey: 'errors.auth.oauthBrowser.title',
        descriptionKey: 'errors.auth.oauthBrowser.description',
        type: 'error',
      });
      return;
    }

    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      reportError(error);
      return;
    }

    trackAuthSignIn('oauth');
    await redirectWebHome();
  }, [reportError, redirectWebHome, trackAuthSignIn]);

  const handleNativeCallback = useCallback(async () => {
    if (hasProcessedRef.current || isProcessingRef.current) {
      return;
    }

    setErrorMessage(null);
    isProcessingRef.current = true;

    // On Android, check if there are actual auth params before processing
    if (Platform.OS === 'android' && !queryParams.code) {
      const url = latestUrl ?? '';
      const hasTokenInUrl =
        typeof url === 'string' &&
        (url.includes('access_token=') || url.includes('refresh_token=') || url.includes('code='));
      if (!hasTokenInUrl) {
        hasProcessedRef.current = true;
        goBackOrHome();
        return;
      }
    }

    // On iOS, check if there's an initial URL from app launch
    // latestUrl is only set for URL events after app is open
    // We need to check getInitialURL() for the URL that launched the app
    const initialUrl = latestUrl ?? (await Linking.getInitialURL());

    logger.info('Checking for initial URL', {
      latestUrl,
      initialUrl,
      hasQueryCode: Boolean(queryParams.code),
    });

    if (Platform.OS === 'ios' && !initialUrl && !queryParams.code) {
      logger.info('No URL detected, redirecting home');
      hasProcessedRef.current = true;
      goBackOrHome();
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    logger.info('Native session present', { hasSession: Boolean(session) });

    if (session) {
      hasProcessedRef.current = true;
      goBackOrHome();
      return;
    }

    if (queryParams.code) {
      hasProcessedRef.current = true;
      const redirectUrl = Linking.createURL('auth-callback', {
        queryParams,
      });
      const { error } = await supabase.auth.exchangeCodeForSession(redirectUrl);
      if (error) {
        reportError(error);
        return;
      }
      trackAuthSignIn('oauth');
      goBackOrHome();
      return;
    }

    // initialUrl is already defined above, reuse it
    const parsedInitial = initialUrl ? Linking.parse(initialUrl) : null;
    const embeddedUrl =
      parsedInitial?.queryParams && typeof parsedInitial.queryParams.url === 'string'
        ? parsedInitial.queryParams.url
        : null;
    const resolvedUrl = embeddedUrl ? decodeURIComponent(embeddedUrl) : initialUrl;
    const parsedResolved = resolvedUrl ? Linking.parse(resolvedUrl) : null;
    const codeFromUrl =
      parsedResolved?.queryParams && typeof parsedResolved.queryParams.code === 'string'
        ? parsedResolved.queryParams.code
        : undefined;

    logger.info('Native initial URL', {
      hasUrl: Boolean(initialUrl),
      hasEmbeddedUrl: Boolean(embeddedUrl),
    });

    logger.info('Native resolved URL', {
      resolvedUrl,
      parsedResolved,
    });

    const hash = resolvedUrl?.split('#')[1] ?? '';
    logger.info('Native hash params', {
      hasHash: Boolean(hash),
      hasAccessToken: hash.includes('access_token='),
      hasRefreshToken: hash.includes('refresh_token='),
    });

    if (codeFromUrl) {
      hasProcessedRef.current = true;
      const redirectUrl = Linking.createURL('auth-callback', {
        queryParams: { code: codeFromUrl },
      });
      const { error } = await supabase.auth.exchangeCodeForSession(redirectUrl);
      if (error) {
        reportError(error);
        return;
      }
      trackAuthSignIn('oauth');
      goBackOrHome();
      return;
    }

    const hashParams = new URLSearchParams(hash);
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const errorCode = hashParams.get('error');
    const errorDescription = hashParams.get('error_description');

    // Handle Supabase error responses in the hash
    if (errorCode) {
      hasProcessedRef.current = true;
      reportError({
        code: errorCode,
        message: errorDescription
          ? decodeURIComponent(errorDescription.replace(/\+/g, ' '))
          : undefined,
        type: 'error',
      });
      return;
    }

    if (accessToken && refreshToken) {
      hasProcessedRef.current = true;
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) {
        reportError(error);
        return;
      }
      trackAuthSignIn('oauth');
      goBackOrHome();
      return;
    }

    // If we have a URL but couldn't extract tokens, the session might already be set
    // This happens with email confirmation links - Supabase processes the token server-side
    // and the session is already available via onAuthStateChange
    if (initialUrl) {
      logger.info('URL present but no tokens extracted, checking for existing session');
      // Don't error immediately - the session listener might pick it up
      // Just wait a bit longer for the session to propagate
      for (let attempt = 0; attempt < 3; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const {
          data: { session: delayedSession },
        } = await supabase.auth.getSession();
        if (delayedSession) {
          hasProcessedRef.current = true;
          goBackOrHome();
          return;
        }
      }
    }

    // Only show error if we have a URL with auth params but couldn't process them
    // This catches: OAuth code failures, or hash fragments with malformed/incomplete tokens
    // Note: Supabase error responses (error=...) are already handled above
    const hasHashContent = hash && hash.length > 0;
    const hasInvalidHash = hasHashContent && !errorCode && (!accessToken || !refreshToken);

    logger.info('Error condition check', {
      initialUrl,
      codeFromUrl,
      hasHashContent,
      hasInvalidHash,
      errorCode,
      willError: Boolean(initialUrl && (codeFromUrl || hasInvalidHash)),
    });

    if (initialUrl && (codeFromUrl || hasInvalidHash)) {
      reportError({
        code: 'auth.oauth.browser',
        titleKey: 'errors.auth.oauthBrowser.title',
        descriptionKey: 'errors.auth.oauthBrowser.description',
        type: 'error',
      });
      return;
    }

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const {
        data: { session: retrySession },
      } = await supabase.auth.getSession();
      if (retrySession) {
        hasProcessedRef.current = true;
        goBackOrHome();
        return;
      }
    }

    if (Platform.OS === 'android') {
      hasProcessedRef.current = true;
      goBackOrHome();
      return;
    }

    isProcessingRef.current = false;
  }, [goBackOrHome, latestUrl, logger, queryParams, reportError, trackAuthSignIn]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      void handleWebCallback();
    } else {
      void handleNativeCallback();
    }
  }, [handleNativeCallback, handleWebCallback]);

  // On native, only render if there's an error to show
  // Otherwise the callback happens silently in the background
  if (Platform.OS !== 'web' && !errorMessage) {
    return null;
  }

  return (
    <ScreenContainer justifyContent="center" alignItems="center" scrollable={false}>
      <YStack gap="$3" alignItems="center">
        <XStack alignItems="center" gap="$2">
          <TitleText>{t('auth.signingIn')}</TitleText>
          {!errorMessage ? <Spinner size="small" color="$accentColor" /> : null}
        </XStack>
        <InlineError message={errorMessage} testID="auth-callback-error" />
        {errorMessage && (
          <PrimaryButton
            onPress={() => router.replace('/(auth)/login')}
            testID="auth-callback-sign-in"
          >
            {t('auth.signIn')}
          </PrimaryButton>
        )}
      </YStack>
    </ScreenContainer>
  );
}
