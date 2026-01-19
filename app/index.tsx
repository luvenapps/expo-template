import { useSessionStore } from '@/auth/session';
import { DOMAIN } from '@/config/domain.config';
import { PrimaryButton, ScreenContainer, SecondaryButton, SubtitleText, TitleText } from '@/ui';
import { Redirect, useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function RootRedirect() {
  const status = useSessionStore((state) => state.status);
  const router = useRouter();
  const { t } = useTranslation();

  if (Platform.OS === 'web' && status === 'unknown') {
    return null;
  }

  if (Platform.OS === 'web') {
    const isAuthenticated = status === 'authenticated';

    return (
      <ScreenContainer gap="$4" alignItems="center">
        <TitleText textAlign="center">
          {(t as unknown as (key: string, options?: Record<string, unknown>) => string)(
            'landing.title',
            { app: DOMAIN.app.displayName },
          )}
        </TitleText>
        <SubtitleText textAlign="center" color="$colorMuted">
          {t('landing.subtitle')}
        </SubtitleText>

        {isAuthenticated ? (
          <PrimaryButton width="100%" onPress={() => router.push('/(tabs)')}>
            {t('landing.enterApp')}
          </PrimaryButton>
        ) : (
          <>
            <PrimaryButton width="100%" onPress={() => router.push('/(auth)/login')}>
              {t('landing.signIn')}
            </PrimaryButton>
            <SecondaryButton width="100%" onPress={() => router.push('/(auth)/signup')}>
              {t('landing.signUp')}
            </SecondaryButton>
          </>
        )}
      </ScreenContainer>
    );
  }

  return <Redirect href="/(tabs)" />;
}
