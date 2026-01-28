import { ScreenContainer, SettingsSection } from '@/ui';
import { useTranslation } from 'react-i18next';
import { Linking } from 'react-native';
import { Button, YStack } from 'tamagui';

const HELP_LINKS = {
  docs: 'https://example.com/docs',
  support: 'https://example.com/support',
  report: 'https://example.com/bug-report',
};

export default function GetHelpScreen() {
  const { t } = useTranslation();

  return (
    <ScreenContainer gap="$5">
      <SettingsSection title={t('settings.getHelpTitle')}>
        <YStack gap="$2">
          <Button onPress={() => Linking.openURL(HELP_LINKS.docs)}>
            {t('settings.getHelpDocs')}
          </Button>
          <Button onPress={() => Linking.openURL(HELP_LINKS.support)}>
            {t('settings.getHelpContact')}
          </Button>
          <Button onPress={() => Linking.openURL(HELP_LINKS.report)}>
            {t('settings.getHelpReportBug')}
          </Button>
        </YStack>
      </SettingsSection>
    </ScreenContainer>
  );
}
