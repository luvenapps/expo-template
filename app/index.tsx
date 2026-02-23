import { useSessionStore } from '@/auth/session';
import { DOMAIN } from '@/config/domain.config';
import { PrimaryButton, ScreenContainer, SecondaryButton, SubtitleText, TitleText } from '@/ui';
import { Redirect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';

export default function RootRedirect() {
  const status = useSessionStore((state) => state.status);
  const router = useRouter();
  const { t } = useTranslation();
  const navigateToAuth = (href: '/(auth)/login' | '/(auth)/signup') => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const activeElement = document.activeElement;
      if (activeElement && 'blur' in activeElement && typeof activeElement.blur === 'function') {
        activeElement.blur();
      }
    }
    router.push(href);
  };

  if (Platform.OS === 'web' && status === 'unknown') {
    return null;
  }

  const isAuthenticated = status === 'authenticated';

  if (Platform.OS === 'web' && !isAuthenticated) {
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

        <PrimaryButton width="100%" onPress={() => navigateToAuth('/(auth)/login')}>
          {t('landing.signIn')}
        </PrimaryButton>
        <SecondaryButton width="100%" onPress={() => navigateToAuth('/(auth)/signup')}>
          {t('landing.signUp')}
        </SecondaryButton>
      </ScreenContainer>
    );
  }

  return <Redirect href="/(tabs)" />;
}
