import { supabase } from '@/auth/client';
import { InlineError, PrimaryButton, ScreenContainer, TitleText } from '@/ui';
import * as Linking from 'expo-linking';
import { useURL } from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';
import { YStack } from 'tamagui';
import { useFriendlyErrorHandler } from '@/errors/useFriendlyErrorHandler';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useTranslation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const handleFriendlyError = useFriendlyErrorHandler();
  const webHashRef = useRef<string | null>(null);
  const hasProcessedRef = useRef(false);
  const isProcessingRef = useRef(false);
  const latestUrl = useURL();
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
    const hasHashParams = Array.from(hashParams.keys()).length > 0;

    if (!accessToken || !refreshToken) {
      if (!hasHashParams) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          window.location.replace('/');
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

    window.location.replace('/');
  }, [reportError]);

  const handleNativeCallback = useCallback(async () => {
    if (hasProcessedRef.current || isProcessingRef.current) {
      return;
    }

    setErrorMessage(null);
    isProcessingRef.current = true;

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

    const {
      data: { session },
    } = await supabase.auth.getSession();
    console.info('[AuthCallback] Native session present', { hasSession: Boolean(session) });

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
      goBackOrHome();
      return;
    }

    const initialUrl = latestUrl ?? (await Linking.getInitialURL());
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

    console.info('[AuthCallback] Native initial URL', {
      hasUrl: Boolean(initialUrl),
      hasEmbeddedUrl: Boolean(embeddedUrl),
    });

    console.info('[AuthCallback] Native resolved URL', {
      resolvedUrl,
      parsedResolved,
    });

    const hash = resolvedUrl?.split('#')[1] ?? '';
    console.info('[AuthCallback] Native hash params', {
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
      goBackOrHome();
      return;
    }

    const hashParams = new URLSearchParams(hash);
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

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
      goBackOrHome();
      return;
    }

    if (initialUrl && (codeFromUrl || hash)) {
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
  }, [goBackOrHome, latestUrl, queryParams, reportError]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      void handleWebCallback();
    } else {
      void handleNativeCallback();
    }
  }, [handleNativeCallback, handleWebCallback]);

  if (Platform.OS !== 'web' && !errorMessage) {
    return null;
  }

  return (
    <ScreenContainer justifyContent="center" alignItems="center" scrollable={false}>
      <YStack gap="$3" alignItems="center">
        <TitleText>{t('auth.signingIn')}</TitleText>
        <InlineError message={errorMessage} testID="auth-callback-error" />
        {errorMessage ? (
          <PrimaryButton
            onPress={() => router.replace('/(auth)/login')}
            testID="auth-callback-sign-in"
          >
            {t('auth.signIn')}
          </PrimaryButton>
        ) : null}
      </YStack>
    </ScreenContainer>
  );
}
