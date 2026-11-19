import { ScreenContainer, SettingsSection } from '@/ui';
import { useThemeContext, type ThemePreference } from '@/ui/theme/ThemeProvider';
import { Monitor, Moon, Sun } from '@/ui/icons';
import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Text, YStack } from 'tamagui';

export default function AppearanceSettingsScreen() {
  const { t } = useTranslation();
  const { preference: themePreference, setPreference } = useThemeContext();

  const THEME_OPTIONS: {
    value: ThemePreference;
    label: string;
    Icon: ComponentType<{ size?: number; color?: string }>;
  }[] = [
    { value: 'system', label: t('settings.themeSystem'), Icon: Monitor },
    { value: 'light', label: t('settings.themeLight'), Icon: Sun },
    { value: 'dark', label: t('settings.themeDark'), Icon: Moon },
  ];

  const handleThemeSelection = (value: ThemePreference) => {
    setPreference(value);
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
                size="lg"
                height="8"
                gap="3"
                borderRadius="3"
                borderStyle="solid"
                borderColor="border-color"
                backgroundColor={{
                  default: isActive ? 'accent-color' : 'background',
                  hover: isActive ? 'accent-color' : 'background-hover',
                  press: isActive ? 'accent-color' : 'background-press',
                }}
                color="color"
                fontWeight="1"
                testID={`theme-option-${value}`}
                opacity={1}
                disabled={isActive}
                aria-label={label}
                onPress={() => handleThemeSelection(value)}
              >
                <Icon size={20} color={isActive ? 'white' : 'color'} />
                <Text
                  testID={`theme-option-label-${value}`}
                  fontSize="3"
                  fontWeight="1"
                  color={isActive ? 'white' : 'color'}
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
