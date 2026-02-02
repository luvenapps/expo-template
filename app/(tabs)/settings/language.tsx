import { setLanguage, supportedLanguages } from '@/i18n';
import { ScreenContainer, SettingsSection } from '@/ui';
import { useTranslation } from 'react-i18next';
import { Button, YStack } from 'tamagui';

export default function LanguageSettingsScreen() {
  const { t, i18n } = useTranslation();
  const currentLanguage = (i18n.language ?? 'en').split('-')[0];

  return (
    <ScreenContainer gap="$5">
      <SettingsSection
        title={t('settings.languageTitle')}
        description={t('settings.languageDescription')}
      >
        <YStack gap="$2" width="100%">
          {supportedLanguages.map((lang) => {
            const isActive = currentLanguage === lang.code;
            return (
              <Button
                key={lang.code}
                testID={`language-option-${lang.code}`}
                aria-label={lang.label}
                role="button"
                size="$5"
                height={48}
                borderRadius="$3"
                borderStyle="solid"
                borderColor="$borderColor"
                backgroundColor={isActive ? '$accentColor' : '$background'}
                color={isActive ? 'white' : '$color'}
                pressStyle={{
                  backgroundColor: isActive ? '$accentColor' : '$backgroundPress',
                }}
                hoverStyle={{
                  backgroundColor: isActive ? '$accentColor' : '$backgroundHover',
                }}
                disabled={isActive}
                onPress={() => setLanguage(lang.code)}
                fontSize="$4"
                fontWeight="300"
              >
                {lang.label}
              </Button>
            );
          })}
        </YStack>
      </SettingsSection>
    </ScreenContainer>
  );
}
