import { useSessionStore } from '@/auth/session';
import { useFriendlyErrorHandler } from '@/errors/useFriendlyErrorHandler';
import { useFeatureFlag } from '@/featureFlags/useFeatureFlag';
import { supportedLanguages } from '@/i18n';
import { NOTIFICATION_PERMISSION_STATE, NOTIFICATION_STATUS } from '@/notifications/status';
import { useNotificationSettings } from '@/notifications/useNotificationSettings';
import { ScreenContainer, useToast } from '@/ui';
import { useThemeContext } from '@/ui/theme/ThemeProvider';
import { ChevronRight } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';
import { Button, Card, Separator, Text, XStack, YStack } from 'tamagui';

const isFirebaseEnabled = () =>
  process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === 'true' ||
  process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === '1';

type SettingsRowProps = {
  title: string;
  value?: string | null;
  onPress: () => void;
  testID?: string;
};

function SettingsRow({ title, value, onPress, testID }: SettingsRowProps) {
  return (
    <Button
      unstyled
      onPress={onPress}
      testID={testID}
      pressStyle={{ opacity: 0.8 }}
      padding={0}
      backgroundColor="transparent"
      borderWidth={0}
      borderRadius={0}
    >
      <XStack alignItems="center" justifyContent="space-between" padding="$4" gap="$3">
        <Text fontSize="$4" fontWeight="600" color="$color">
          {title}
        </Text>
        <XStack alignItems="center" gap="$2" flexShrink={1} justifyContent="space-between">
          {value ? (
            <Text
              color="$colorMuted"
              fontSize="$4"
              numberOfLines={1}
              ellipsizeMode="tail"
              maxWidth="90%"
            >
              {value}
            </Text>
          ) : null}
          <ChevronRight size={18} color="$colorMuted" />
        </XStack>
      </XStack>
    </Button>
  );
}

function SettingsGroup({ children }: { children: ReactNode }) {
  return (
    <Card bordered elevate padding={0} backgroundColor="$backgroundStrong" borderRadius="$5">
      <YStack>{children}</YStack>
    </Card>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { theme: themePreference } = useThemeContext();
  const toast = useToast();
  const showFriendlyError = useFriendlyErrorHandler(toast);
  const status = useSessionStore((state) => state.status);
  const session = useSessionStore((state) => state.session);
  const { permissionStatus, notificationStatus } = useNotificationSettings();
  const { value: termsUrl } = useFeatureFlag('legal_terms_url', '');
  const { value: privacyUrl } = useFeatureFlag('legal_privacy_url', '');

  const isNative = Platform.OS !== 'web';
  const notificationsBlocked = isNative
    ? permissionStatus === NOTIFICATION_PERMISSION_STATE.BLOCKED ||
      permissionStatus === NOTIFICATION_PERMISSION_STATE.DENIED ||
      permissionStatus === NOTIFICATION_PERMISSION_STATE.UNAVAILABLE
    : permissionStatus === NOTIFICATION_PERMISSION_STATE.BLOCKED;

  const pushEnabled = isFirebaseEnabled()
    ? notificationStatus === NOTIFICATION_STATUS.GRANTED
    : permissionStatus === NOTIFICATION_PERMISSION_STATE.GRANTED;

  const appearanceLabel = useMemo(() => {
    if (themePreference === 'light') return t('settings.themeLight');
    if (themePreference === 'dark') return t('settings.themeDark');
    return t('settings.themeSystem');
  }, [themePreference, t]);

  const currentLanguage = (i18n.language ?? 'en').split('-')[0];
  const languageLabel =
    supportedLanguages.find((lang) => lang.code === currentLanguage)?.label ?? currentLanguage;

  const notificationsLabel = notificationsBlocked
    ? t('settings.summarySetupNeeded')
    : pushEnabled
      ? t('settings.summaryOn')
      : t('settings.summaryOff');

  const accountLabel =
    status === 'authenticated'
      ? (session?.user?.email ?? t('settings.accountSignedIn'))
      : t('settings.signIn');

  const openExternal = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      showFriendlyError(error, { surface: 'settings.legal-links' });
    }
  };

  return (
    <ScreenContainer gap="$4" paddingHorizontal="$4" contentContainerStyle={{ paddingBottom: 48 }}>
      <SettingsGroup>
        <SettingsRow
          title={t('settings.themeTitle')}
          value={appearanceLabel}
          onPress={() => router.push('/(tabs)/settings/appearance')}
        />
        <Separator />
        <SettingsRow
          title={t('settings.languageTitle')}
          value={languageLabel}
          onPress={() => router.push('/(tabs)/settings/language')}
        />
        <Separator />
        <SettingsRow
          title={t('settings.notificationsTitle')}
          value={notificationsLabel}
          onPress={() => router.push('/(tabs)/settings/notifications')}
        />
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow
          title={t('settings.accountTitle')}
          value={accountLabel}
          onPress={() => router.push('/(tabs)/settings/account')}
        />
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow
          title={t('settings.developerUtilitiesTitle')}
          onPress={() => router.push('/(tabs)/settings/developer-utilities')}
        />
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow
          title={t('settings.getHelpTitle')}
          onPress={() => router.push('/(tabs)/settings/get-help')}
        />
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow
          title={t('settings.termsTitle')}
          onPress={() => {
            if (termsUrl) {
              openExternal(termsUrl);
              return;
            }
            router.push('/(tabs)/settings/terms');
          }}
        />
        <Separator />
        <SettingsRow
          title={t('settings.privacyTitle')}
          onPress={() => {
            if (privacyUrl) {
              openExternal(privacyUrl);
              return;
            }
            router.push('/(tabs)/settings/privacy');
          }}
        />
      </SettingsGroup>
    </ScreenContainer>
  );
}
