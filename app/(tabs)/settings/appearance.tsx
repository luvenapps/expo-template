import { ScreenContainer, SettingsSection } from '@/ui';
import { useThemeContext, type ThemeName } from '@/ui/theme/ThemeProvider';
import { Monitor, Moon, Sun } from '@tamagui/lucide-icons';
import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, XStack } from 'tamagui';

export default function AppearanceSettingsScreen() {
  const { t } = useTranslation();
  const { theme: themePreference, setTheme } = useThemeContext();

  const THEME_OPTIONS: {
    value: ThemeName;
    label: string;
    Icon: ComponentType<{ size?: number; color?: string }>;
  }[] = [
    { value: 'system', label: 'Follow System', Icon: Monitor },
    { value: 'light', label: 'Light', Icon: Sun },
    { value: 'dark', label: 'Dark', Icon: Moon },
  ];

  const handleThemeSelection = (value: ThemeName) => {
    setTheme(value);
  };

  return (
    <ScreenContainer gap="$5">
      <SettingsSection title={t('settings.themeTitle')}>
        <XStack gap="$2" width="100%">
          {THEME_OPTIONS.map(({ value, label, Icon }) => {
            const isActive = themePreference === value;
            return (
              <Button
                key={value}
                flex={1}
                size="$5"
                height={48}
                borderRadius="$3"
                borderStyle="solid"
                borderColor="$borderColor"
                backgroundColor={isActive ? '$accentColor' : '$background'}
                color="$color"
                pressStyle={{
                  backgroundColor: isActive ? '$accentColor' : '$backgroundPress',
                }}
                hoverStyle={{
                  backgroundColor: isActive ? '$accentColor' : '$backgroundHover',
                }}
                disabled={isActive}
                aria-label={
                  value === 'system'
                    ? t('settings.themeSystem')
                    : value === 'light'
                      ? t('settings.themeLight')
                      : t('settings.themeDark')
                }
                onPress={() => handleThemeSelection(value)}
              >
                <Icon size={20} color={isActive ? 'white' : '$color'} />
              </Button>
            );
          })}
        </XStack>
      </SettingsSection>
    </ScreenContainer>
  );
}
