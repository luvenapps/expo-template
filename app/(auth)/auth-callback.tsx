import { supabase } from '@/auth/client';
import { InlineError, PrimaryButton, ScreenContainer, TitleText } from '@/ui';
import * as Linking from 'expo-linking';
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

    hasProcessedRef.current = true;

    if (webHashRef.current === null) {
      webHashRef.current = window.location.hash ?? '';
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    const hashParams = new URLSearchParams(webHashRef.current.replace(/^#/, ''));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    if (!accessToken || !refreshToken) {
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
    if (hasProcessedRef.current) {
      return;
    }

    hasProcessedRef.current = true;

    if (!queryParams.code) {
      reportError({
        code: 'auth.oauth.browser',
        titleKey: 'errors.auth.oauthBrowser.title',
        descriptionKey: 'errors.auth.oauthBrowser.description',
        type: 'error',
      });
      return;
    }

    const redirectUrl = Linking.createURL('auth-callback', { queryParams });
    const { error } = await supabase.auth.exchangeCodeForSession(redirectUrl);
    if (error) {
      reportError(error);
      return;
    }
    router.replace('/(tabs)');
  }, [queryParams, reportError, router]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      void handleWebCallback();
    } else {
      void handleNativeCallback();
    }
  }, [handleNativeCallback, handleWebCallback]);

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
