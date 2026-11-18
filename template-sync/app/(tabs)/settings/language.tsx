import { setLanguage, supportedLanguages } from '@/i18n';
import { ScreenContainer, SettingsSection } from '@/ui';
import { useTranslation } from 'react-i18next';
import { Button, YStack } from 'tamagui';

export default function LanguageSettingsScreen() {
  const { t, i18n } = useTranslation();
  const currentLanguage = (i18n.language ?? 'en').split('-')[0];

  return (
    <ScreenContainer gap="$4">
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
                size="legacy5"
                height={48}
                borderRadius="3"
                borderStyle="solid"
                borderColor="border-color"
                backgroundColor={`${isActive ? 'accent-color' : 'background'} hover:${isActive ? 'accent-color' : 'background-hover'} press:${isActive ? 'accent-color' : 'background-press'}`}
                color={`${isActive ? 'white' : 'color'}`}
                fontSize="$4"
                fontWeight="300"
                opacity={1}
                disabled={isActive}
                onPress={() => setLanguage(lang.code)}
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
