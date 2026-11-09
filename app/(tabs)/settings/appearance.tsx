import { ScreenContainer, SettingsSection } from '@/ui';
import { useThemeContext, type ThemeName } from '@/ui/theme/ThemeProvider';
import { Monitor, Moon, Sun } from '@/ui/icons';
import type { ComponentType } from 'react';
import { Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Text, YStack } from 'tamagui';

const THEME_OPTION_WEB_TEXT_STYLE = {
  fontFamily: 'Arial',
  fontSize: 16,
  fontWeight: '300',
} as const;

export default function AppearanceSettingsScreen() {
  const { t } = useTranslation();
  const { theme: themePreference, setTheme } = useThemeContext();

  const THEME_OPTIONS: {
    value: ThemeName;
    label: string;
    Icon: ComponentType<{ size?: number; color?: string }>;
  }[] = [
    { value: 'system', label: t('settings.themeSystem'), Icon: Monitor },
    { value: 'light', label: t('settings.themeLight'), Icon: Sun },
    { value: 'dark', label: t('settings.themeDark'), Icon: Moon },
  ];

  const handleThemeSelection = (value: ThemeName) => {
    setTheme(value);
  };

  return (
    <ScreenContainer gap="4">
      <SettingsSection title={t('settings.themeTitle')}>
        <YStack gap="2" width="100%">
          {THEME_OPTIONS.map(({ value, label, Icon }) => {
            const isActive = themePreference === value;
            return (
              <Button
                key={value}
                size="legacy5"
                height={48}
                gap={Platform.OS === 'web' ? '10.555px' : '2'}
                borderRadius="3"
                borderStyle="solid"
                borderColor="border-color"
                backgroundColor={`${isActive ? 'accent-color' : 'background'} hover:${isActive ? 'accent-color' : 'background-hover'} press:${isActive ? 'accent-color' : 'background-press'}`}
                color="color"
                fontWeight="300"
                testID={`theme-option-${value}`}
                opacity={1}
                disabled={isActive}
                aria-label={label}
                onPress={() => handleThemeSelection(value)}
              >
                <Icon size={20} color={isActive ? 'white' : 'color'} />
                <Text
                  testID={`theme-option-label-${value}`}
                  fontSize="4"
                  color={`${isActive ? 'white' : 'color'}`}
                  style={Platform.OS === 'web' ? THEME_OPTION_WEB_TEXT_STYLE : undefined}
                >
                  {label}
                </Text>
              </Button>
            );
          })}
        </YStack>
      </SettingsSection>
    </ScreenContainer>
  );
}
