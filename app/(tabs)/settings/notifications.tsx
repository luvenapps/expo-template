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
    tryPromptForPush,
    disablePushNotifications,
    error: notificationError,
    pushError,
    isChecking: isCheckingNotifications,
  } = useNotificationSettings();

  const firebaseEnabled =
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === 'true' ||
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === '1';

  const notificationsBlocked = isNative
    ? permissionStatus === NOTIFICATION_PERMISSION_STATE.BLOCKED ||
      permissionStatus === NOTIFICATION_PERMISSION_STATE.DENIED ||
      permissionStatus === NOTIFICATION_PERMISSION_STATE.UNAVAILABLE
    : permissionStatus === NOTIFICATION_PERMISSION_STATE.BLOCKED;

  const pushEnabled = firebaseEnabled
    ? notificationStatus === NOTIFICATION_STATUS.GRANTED
    : permissionStatus === NOTIFICATION_PERMISSION_STATE.GRANTED;

  const pushStatusText = (() => {
    if (pushError) return pushError;
    if (!firebaseEnabled) {
      return permissionStatus === NOTIFICATION_PERMISSION_STATE.GRANTED
        ? t('settings.pushStatusEnabledSimple')
        : t('settings.pushStatusDisabledSimple');
    }
    if (notificationStatus === NOTIFICATION_STATUS.GRANTED)
      return t('settings.pushStatusEnabledSimple');
    if (
      notificationStatus === NOTIFICATION_STATUS.DENIED ||
      notificationStatus === NOTIFICATION_STATUS.UNAVAILABLE
    )
      return t('settings.pushStatusDisabledSimple');
    if (notificationStatus === NOTIFICATION_STATUS.SOFT_DECLINED)
      return t('settings.pushStatusDisabledSimple');
    return t('settings.pushStatusDisabledSimple');
  })();

  const handlePromptPush = async () => {
    const result = await tryPromptForPush({ context: 'manual', skipSoftPrompt: true });

    if (result.status === 'triggered' || result.status === 'already-enabled') {
      return;
    }

    if (result.status === NOTIFICATION_STATUS.DENIED) {
      return;
    }
  };

  return (
    <ScreenContainer gap="$5">
      <SettingsSection
        title={t('settings.notificationsTitle')}
        description={t('settings.notificationsDescription')}
        footer={notificationsBlocked ? undefined : (notificationError ?? undefined)}
      >
        {notificationsBlocked ? (
          <YStack gap="$2" paddingBottom={isNative ? '$5' : ''}>
            <Paragraph
              color="$dangerColor"
              fontSize="$4"
              fontWeight="$5"
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
          <XStack alignItems="center" width="100%" justifyContent="space-between">
            <Paragraph color="$colorMuted" fontSize="$3" testID="settings-push-status">
              {pushStatusText}
            </Paragraph>
            <View width={Platform.OS === 'web' ? 64 : 'auto'} alignItems="flex-end">
              <Switch
                testID="settings-push-toggle"
                size="$7"
                disabled={notificationsBlocked || isCheckingNotifications}
                checked={pushEnabled}
                onCheckedChange={(val) => {
                  const checked = Boolean(val);
                  if (checked) {
                    void handlePromptPush();
                  } else {
                    disablePushNotifications();
                  }
                }}
                borderColor={Platform.OS === 'web' ? '$borderColor' : undefined}
                borderWidth={Platform.OS === 'web' ? 1 : undefined}
                backgroundColor={pushEnabled ? '$accentColor' : '$secondaryBackground'}
                pressStyle={{ opacity: 0.9 }}
                cursor="pointer"
              >
                <Switch.Thumb borderWidth={1} borderColor="$borderColor" />
              </Switch>
            </View>
          </XStack>
        )}
      </SettingsSection>
    </ScreenContainer>
  );
}
