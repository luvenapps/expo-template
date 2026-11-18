import { NOTIFICATION_PERMISSION_STATE, NOTIFICATION_STATUS } from '@/notifications/status';
import { useNotificationSettings } from '@/notifications/useNotificationSettings';
import { PrimaryButton, ScreenContainer, SettingsSection } from '@/ui';

import { useTranslation } from 'react-i18next';
import { Linking, Platform } from 'react-native';
import { Paragraph, Switch, View, XStack, YStack } from 'tamagui';

export default function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const isNative = Platform.OS !== 'web';
  const {
    permissionStatus,
    notificationStatus,
    pushManuallyDisabled,
    isSupported,
    tryPromptForPush,
    disablePushNotifications,
    error: notificationError,
    pushError,
    isChecking: isCheckingNotifications,
  } = useNotificationSettings();

  const isMobileWeb = !isSupported;

  const firebaseEnabled =
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === 'true' ||
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === '1';

  const notificationsBlocked = isNative
    ? permissionStatus === NOTIFICATION_PERMISSION_STATE.BLOCKED ||
      permissionStatus === NOTIFICATION_PERMISSION_STATE.DENIED ||
      permissionStatus === NOTIFICATION_PERMISSION_STATE.UNAVAILABLE
    : permissionStatus === NOTIFICATION_PERMISSION_STATE.BLOCKED;

  const pushEnabled = firebaseEnabled
    ? notificationStatus === NOTIFICATION_STATUS.GRANTED && !pushManuallyDisabled
    : permissionStatus === NOTIFICATION_PERMISSION_STATE.GRANTED && !pushManuallyDisabled;

  const pushStatusText = (() => {
    if (pushError) return pushError;
    return pushEnabled
      ? t('settings.pushStatusEnabledSimple')
      : t('settings.pushStatusDisabledSimple');
  })();

  const pushToggleDisabled = notificationsBlocked || isCheckingNotifications;

  const handlePromptPush = async () => {
    await tryPromptForPush({ context: 'manual', skipSoftPrompt: true });
  };

  return (
    <ScreenContainer gap="$4">
      <SettingsSection
        title={t('settings.notificationsTitle')}
        description={t('settings.notificationsDescription')}
        footer={notificationsBlocked ? undefined : (notificationError ?? undefined)}
      >
        {isMobileWeb ? (
          <YStack gap="$2" paddingBottom="2" flexWrap="wrap" width="100%" alignItems="center">
            <Paragraph
              color="colorMuted"
              fontSize="$3"
              flex={1}
              flexShrink={1}
              testID="settings-notification-mobile-web"
            >
              {t('settings.pushStatusMobileWebDisabled')}
            </Paragraph>
          </YStack>
        ) : notificationsBlocked ? (
          <YStack gap="$2" paddingBottom={`${isNative ? '5' : ''}`}>
            <Paragraph
              color="dangerColor"
              fontSize="$4"
              fontWeight="5"
              textAlign="center"
              testID="settings-notification-blocked"
            >
              {t('settings.remindersBlocked')}
            </Paragraph>
            {isNative ? (
              <PrimaryButton
                testID="open-notification-settings-button"
                onPress={() => Linking.openSettings()}
              >
                {t('settings.openSettings')}
              </PrimaryButton>
            ) : null}
          </YStack>
        ) : (
          <XStack
            flexDirection="row"
            alignItems="center"
            width="100%"
            justifyContent="space-between"
            gap="$2"
            flexWrap="wrap"
          >
            <Paragraph
              color="colorMuted"
              fontSize="$3"
              flex={1}
              flexShrink={1}
              testID="settings-push-status"
            >
              {pushStatusText}
            </Paragraph>
            <View width={Platform.OS === 'web' ? 64 : 'auto'} alignItems="flex-end">
              <Switch
                testID="settings-push-toggle"
                size="legacy7"
                width={56}
                borderColor={Platform.OS === 'web' ? 'border-color' : undefined}
                borderWidth={/* istanbul ignore next */ Platform.OS === 'web' ? 1 : undefined}
                backgroundColor={`${pushEnabled ? 'accent-color' : 'secondaryBackground'}`}
                opacity="press:0.9"
                cursor="pointer"
                disabled={pushToggleDisabled}
                checked={pushEnabled}
                onCheckedChange={(val) => {
                  const checked = Boolean(val);
                  if (checked) {
                    void handlePromptPush();
                  } else {
                    disablePushNotifications();
                  }
                }}
              >
                <Switch.Thumb borderWidth={1} borderColor="border-color" />
              </Switch>
            </View>
          </XStack>
        )}
      </SettingsSection>
    </ScreenContainer>
  );
}
