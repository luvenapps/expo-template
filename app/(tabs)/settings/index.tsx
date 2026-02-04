import { useSessionStore } from '@/auth/session';
import { useFriendlyErrorHandler } from '@/errors/useFriendlyErrorHandler';
import { useFeatureFlag } from '@/featureFlags/useFeatureFlag';
import { supportedLanguages } from '@/i18n';
import { NOTIFICATION_PERMISSION_STATE, NOTIFICATION_STATUS } from '@/notifications/status';
import { useNotificationSettings } from '@/notifications/useNotificationSettings';
import { ScreenContainer, useToast } from '@/ui';
import { useThemeContext } from '@/ui/theme/ThemeProvider';
import {
  Bell,
  ChevronRight,
  FileText,
  HelpCircle,
  Languages,
  Palette,
  Shield,
  User,
  Wrench,
} from '@tamagui/lucide-icons';
import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import type { ReactNode } from 'react';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';
import { Button, Card, Separator, Text, XStack, YStack } from 'tamagui';

const isFirebaseEnabled = () =>
  process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === 'true' ||
  process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === '1';

type SettingsRowProps = {
  title: string;
  value?: string | null;
  icon?: ReactNode;
  iconBackground?: string;
  onPress: () => void;
  testID?: string;
};

export function SettingsRow({
  title,
  value,
  icon,
  iconBackground,
  onPress,
  testID,
}: SettingsRowProps) {
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
        <XStack alignItems="center" gap="$3" flex={1} minWidth={0}>
          {icon ? (
            <XStack
              width={32}
              height={32}
              borderRadius={8}
              alignItems="center"
              justifyContent="center"
              backgroundColor={iconBackground ?? '$backgroundHover'}
            >
              {icon}
            </XStack>
          ) : null}
          <Text fontSize="$4" fontWeight="400" color="$color" numberOfLines={1}>
            {title}
          </Text>
        </XStack>
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
  const { permissionStatus, notificationStatus, refreshPermissionStatus, refreshPreferences } =
    useNotificationSettings();
  const { value: termsUrl } = useFeatureFlag('legal_terms_url', '');
  const { value: privacyUrl } = useFeatureFlag('legal_privacy_url', '');

  useFocusEffect(
    useCallback(() => {
      refreshPermissionStatus().catch(() => undefined);
      refreshPreferences();
    }, [refreshPermissionStatus, refreshPreferences]),
  );

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
    <ScreenContainer
      gap="$4"
      paddingHorizontal="$4"
      backgroundColor="$background"
      contentContainerStyle={{ flexGrow: 1, paddingBottom: 48 }}
    >
      <SettingsGroup>
        <SettingsRow
          title={t('settings.themeTitle')}
          value={appearanceLabel}
          icon={<Palette size={18} color="white" />}
          iconBackground="#5E5CE6"
          onPress={() => router.push('/(tabs)/settings/appearance')}
        />
        <Separator />
        <SettingsRow
          title={t('settings.languageTitle')}
          value={languageLabel}
          icon={<Languages size={18} color="white" />}
          iconBackground="#FF9500"
          onPress={() => router.push('/(tabs)/settings/language')}
        />
        <Separator />
        <SettingsRow
          title={t('settings.notificationsTitle')}
          value={notificationsLabel}
          icon={<Bell size={18} color="white" />}
          iconBackground="#FF3B30"
          onPress={() => router.push('/(tabs)/settings/notifications')}
        />
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow
          title={t('settings.accountTitle')}
          value={accountLabel}
          icon={<User size={15} color="white" />}
          iconBackground="#007AFF"
          onPress={() => {
            router.push('/(tabs)/settings/account');
          }}
        />
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow
          title={t('settings.developerUtilitiesTitle')}
          icon={<Wrench size={18} color="white" />}
          iconBackground="#8E8E93"
          onPress={() => router.push('/(tabs)/settings/developer-utilities')}
        />
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow
          title={t('settings.getHelpTitle')}
          icon={<HelpCircle size={18} color="white" />}
          iconBackground="#34C759"
          onPress={() => router.push('/(tabs)/settings/get-help')}
        />
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow
          title={t('settings.termsTitle')}
          icon={<FileText size={18} color="white" />}
          iconBackground="#AF52DE"
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
          icon={<Shield size={18} color="white" />}
          iconBackground="#30B0C7"
          onPress={() => {
            if (privacyUrl) {
              openExternal(privacyUrl);
              return;
            }
            router.push('/(tabs)/settings/privacy');
          }}
        />
      </SettingsGroup>

      <YStack alignItems="center" paddingVertical="$4" gap="$2">
        <Text fontSize="$4" color="$colorMuted" testID="app-version">
          {'v'}
          {Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? '1.0.0'}
        </Text>
      </YStack>
    </ScreenContainer>
  );
}
