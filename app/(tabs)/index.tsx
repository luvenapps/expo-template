import { DOMAIN } from '@/config/domain.config';
import { PrimaryButton, ScreenContainer } from '@/ui';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { H2, Paragraph } from 'tamagui';

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <>
      <ScreenContainer gap="$4" alignItems="center">
        <H2 fontWeight="700" testID="welcome-title">
          {(t as unknown as (k: string, opts?: Record<string, any>) => string)('home.title', {
            app: DOMAIN.app.displayName,
          })}
        </H2>
        <Paragraph textAlign="center" color="$colorMuted">
          {t('home.subtitle')}
        </Paragraph>
        <PrimaryButton
          width="100%"
          testID="get-started-button"
          onPress={() => router.push('/(tabs)/settings')}
        >
          {t('home.cta')}
        </PrimaryButton>
      </ScreenContainer>
    </>
  );
}
