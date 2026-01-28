import { ScreenContainer, SettingsSection } from '@/ui';
import { useTranslation } from 'react-i18next';
import { Linking } from 'react-native';
import { Button } from 'tamagui';

const PRIVACY_URL = 'https://example.com/privacy';

export default function PrivacyScreen() {
  const { t } = useTranslation();

  return (
    <ScreenContainer gap="$5">
      <SettingsSection title={t('settings.privacyTitle')}>
        <Button onPress={() => Linking.openURL(PRIVACY_URL)}>{t('settings.openPrivacy')}</Button>
      </SettingsSection>
    </ScreenContainer>
  );
}
