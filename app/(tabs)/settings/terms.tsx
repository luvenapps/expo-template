import { ScreenContainer, SettingsSection } from '@/ui';
import { useTranslation } from 'react-i18next';
import { Linking } from 'react-native';
import { Button } from 'tamagui';

const TERMS_URL = 'https://example.com/terms';

export default function TermsScreen() {
  const { t } = useTranslation();

  return (
    <ScreenContainer gap="$5">
      <SettingsSection title={t('settings.termsTitle')}>
        <Button onPress={() => Linking.openURL(TERMS_URL)}>{t('settings.openTerms')}</Button>
      </SettingsSection>
    </ScreenContainer>
  );
}
