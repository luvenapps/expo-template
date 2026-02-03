import { getLocalName } from '@/auth/nameStorage';
import { DOMAIN } from '@/config/domain.config';
import { PrimaryButton, ScreenContainer } from '@/ui';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { H2, Paragraph } from 'tamagui';

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [localName, setLocalName] = useState(() => getLocalName());
  const firstName = localName?.trim().split(/\s+/)[0];

  useFocusEffect(
    useCallback(() => {
      setLocalName(getLocalName());
    }, []),
  );

  return (
    <>
      <ScreenContainer gap="$4" alignItems="center">
        <H2 fontWeight="700" fontSize={40} testID="welcome-title" textAlign="center">
          {(t as unknown as (k: string, opts?: Record<string, any>) => string)('home.title', {
            app: DOMAIN.app.displayName,
          })}
          {firstName ? `, ${firstName}` : ''}
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
