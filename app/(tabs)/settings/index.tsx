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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, View as RNView } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Button, Card, Separator, Text, XStack, YStack } from 'tamagui';

const isFirebaseEnabled = () =>
  process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === 'true' ||
  process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === '1';

const MARQUEE_PAUSE_MS = 1500;
const MARQUEE_SPEED_PX_PER_SEC = 30;
const MARQUEE_EDGE_PADDING = 8; // Extra scroll distance at each end

type MarqueeTextProps = {
  text: string;
};

function MarqueeText({ text }: MarqueeTextProps) {
  // On web, render simple text with ellipsis (same as valueMarquee={false})
  if (Platform.OS === 'web') {
    return (
      <Text color="$colorMuted" fontSize="$4" numberOfLines={1} ellipsizeMode="tail" flexShrink={1}>
        {text}
      </Text>
    );
  }

  return <MarqueeTextNative text={text} />;
}

function MarqueeTextNative({ text }: { text: string }) {
  const [textWidth, setTextWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const translateX = useSharedValue(0);

  // Check if text overflows the container (with 1px threshold to avoid floating point issues)
  const rawOverflow = textWidth - containerWidth;
  const isOverflowing = textWidth > 0 && containerWidth > 0 && rawOverflow > 1;

  // Total scroll distance includes padding at both ends
  const scrollDistance = rawOverflow + MARQUEE_EDGE_PADDING * 2;

  const directionRef = useRef<'left' | 'right'>('left');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Reset direction when effect re-runs
    directionRef.current = 'left';

    if (!isOverflowing) {
      cancelAnimation(translateX);
      translateX.value = 0;
      return;
    }

    const scrollDuration = (scrollDistance / MARQUEE_SPEED_PX_PER_SEC) * 1000;
    // Start position: shifted right by edge padding
    const startPos = MARQUEE_EDGE_PADDING;
    // End position: shifted left to show end of text plus padding
    const endPos = -(rawOverflow + MARQUEE_EDGE_PADDING);

    // Set initial position
    translateX.value = startPos;

    const animateStep = () => {
      if (directionRef.current === 'left') {
        // Scroll left to show end of text
        translateX.value = withTiming(endPos, {
          duration: scrollDuration,
          easing: Easing.linear,
        });
        directionRef.current = 'right';
        // Schedule next step after scroll + pause
        timeoutRef.current = setTimeout(animateStep, scrollDuration + MARQUEE_PAUSE_MS);
      } else {
        // Scroll right back to start
        translateX.value = withTiming(startPos, {
          duration: scrollDuration,
          easing: Easing.linear,
        });
        directionRef.current = 'left';
        // Schedule next step after scroll + pause
        timeoutRef.current = setTimeout(animateStep, scrollDuration + MARQUEE_PAUSE_MS);
      }
    };

    // Start with initial pause, then begin animation
    timeoutRef.current = setTimeout(animateStep, MARQUEE_PAUSE_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      cancelAnimation(translateX);
    };
  }, [isOverflowing, rawOverflow, scrollDistance, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <RNView
      style={{ overflow: 'hidden', flexShrink: 1, pointerEvents: 'none' }}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {/* Hidden measurement text - use onTextLayout to get actual text width */}
      <RNView style={{ position: 'absolute', top: 0, left: 0, opacity: 0, pointerEvents: 'none' }}>
        <Text
          color="$colorMuted"
          fontSize="$4"
          onTextLayout={(e) => {
            const lines = e.nativeEvent.lines;
            if (lines.length > 0) {
              const totalWidth = lines.reduce((sum, line) => sum + line.width, 0);
              setTextWidth(totalWidth);
            }
          }}
        >
          {text}
        </Text>
      </RNView>
      {/* Visible text - animated if overflowing, static otherwise */}
      <Animated.View style={[{ width: textWidth > 0 ? textWidth : undefined }, animatedStyle]}>
        <Text color="$colorMuted" fontSize="$4">
          {text}
        </Text>
      </Animated.View>
    </RNView>
  );
}

type SettingsRowProps = {
  title: string;
  value?: string | null;
  valueMarquee?: boolean;
  icon?: ReactNode;
  iconBackground?: string;
  onPress: () => void;
  testID?: string;
};

export function SettingsRow({
  title,
  value,
  valueMarquee,
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
        <XStack alignItems="center" gap="$3" flexShrink={0}>
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
        <XStack alignItems="center" gap="$2" flexShrink={1} justifyContent="flex-end" minWidth={0}>
          {value ? (
            valueMarquee ? (
              <MarqueeText text={value} />
            ) : (
              <Text
                color="$colorMuted"
                fontSize="$4"
                numberOfLines={1}
                ellipsizeMode="tail"
                flexShrink={1}
              >
                {value}
              </Text>
            )
          ) : null}
          <ChevronRight size={18} color="$colorMuted" flexShrink={0} />
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
  const { theme: themePreference, resolvedTheme } = useThemeContext();
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

  const isDarkMode = resolvedTheme === 'dark';
  const getIconStyles = useCallback(
    (accent: string) => ({
      background: isDarkMode ? '$transparent' : accent,
      color: isDarkMode ? accent : 'white',
    }),
    [isDarkMode],
  );

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

  const themeIcon = getIconStyles('#5E5CE6');
  const languageIcon = getIconStyles('#FF9500');
  const notificationsIcon = getIconStyles('#FF3B30');
  const accountIcon = getIconStyles('#007AFF');
  const developerIcon = getIconStyles('#8E8E93');
  const helpIcon = getIconStyles('#34C759');
  const termsIcon = getIconStyles('#AF52DE');
  const privacyIcon = getIconStyles('#30B0C7');
  const showDevTools =
    (globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ ??
    process.env.NODE_ENV !== 'production';

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
          icon={<Palette size={18} color={themeIcon.color} />}
          iconBackground={themeIcon.background}
          onPress={() => router.push('/(tabs)/settings/appearance')}
        />
        <Separator />
        <SettingsRow
          title={t('settings.languageTitle')}
          value={languageLabel}
          icon={<Languages size={18} color={languageIcon.color} />}
          iconBackground={languageIcon.background}
          onPress={() => router.push('/(tabs)/settings/language')}
        />
        <Separator />
        <SettingsRow
          title={t('settings.notificationsTitle')}
          value={notificationsLabel}
          icon={<Bell size={18} color={notificationsIcon.color} />}
          iconBackground={notificationsIcon.background}
          onPress={() => router.push('/(tabs)/settings/notifications')}
        />
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow
          title={t('settings.accountTitle')}
          value={accountLabel}
          icon={<User size={15} color={accountIcon.color} />}
          iconBackground={accountIcon.background}
          onPress={() => {
            router.push('/(tabs)/settings/account');
          }}
          valueMarquee={true}
        />
      </SettingsGroup>

      {showDevTools ? (
        <SettingsGroup>
          <SettingsRow
            title={t('settings.developerUtilitiesTitle')}
            icon={<Wrench size={18} color={developerIcon.color} />}
            iconBackground={developerIcon.background}
            onPress={() => router.push('/(tabs)/settings/developer-utilities')}
          />
        </SettingsGroup>
      ) : null}

      <SettingsGroup>
        <SettingsRow
          title={t('settings.getHelpTitle')}
          icon={<HelpCircle size={18} color={helpIcon.color} />}
          iconBackground={helpIcon.background}
          onPress={() => router.push('/(tabs)/settings/get-help')}
        />
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow
          title={t('settings.termsTitle')}
          icon={<FileText size={18} color={termsIcon.color} />}
          iconBackground={termsIcon.background}
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
          icon={<Shield size={18} color={privacyIcon.color} />}
          iconBackground={privacyIcon.background}
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
          {Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.0.0'}
        </Text>
      </YStack>
    </ScreenContainer>
  );
}
