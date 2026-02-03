import { clearPendingRemoteReset, deleteRemoteUserData, setPendingRemoteReset } from '@/auth/reset';
import { useSessionStore } from '@/auth/session';
import { clearAllTables, hasData } from '@/db/sqlite';
import { clearReminderSeriesConfigs } from '@/notifications/scheduler';
import { cancelAllScheduledNotifications, resetBadgeCount } from '@/notifications/notifications';
import { clearNotificationPreferences } from '@/notifications/preferences';
import { resetCursors } from '@/sync/cursors';
import { useSyncStore } from '@/state';
import { useFriendlyErrorHandler } from '@/errors/useFriendlyErrorHandler';
import { createLogger } from '@/observability/logger';
import {
  PrimaryButton,
  ScreenContainer,
  SecondaryButton,
  SettingsSection,
  ToastContainer,
  UserOnly,
  useToast,
} from '@/ui';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';
import { Dialog, Spinner, XStack, YStack } from 'tamagui';

export default function AccountSettingsScreen() {
  const router = useRouter();
  const status = useSessionStore((state) => state.status);
  const session = useSessionStore((state) => state.session);
  const signOut = useSessionStore((state) => state.signOut);
  const isLoading = useSessionStore((state) => state.isLoading);
  const isNative = Platform.OS !== 'web';
  const [isResettingAllData, setIsResettingAllData] = useState(false);
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [, setHasDbData] = useState(false);
  const toast = useToast();
  const { t } = useTranslation();
  const showFriendlyError = useFriendlyErrorHandler(toast);
  const settingsLogger = useMemo(() => createLogger('Settings'), []);

  const checkDatabaseData = useCallback(async () => {
    if (!isNative) return;
    try {
      const dataExists = await hasData();
      setHasDbData(dataExists);
    } catch (error) {
      settingsLogger.error('Error checking database data:', error);
      setHasDbData(false);
    }
  }, [isNative, settingsLogger]);

  useEffect(() => {
    if (isNative) {
      checkDatabaseData();
    }
  }, [isNative, checkDatabaseData]);

  const handleAuthAction = async () => {
    if (status === 'authenticated') {
      setIsSigningOut(true);
      try {
        await signOut();
      } finally {
        setIsSigningOut(false);
      }
      if (Platform.OS === 'web') {
        router.replace('/');
      }
    } else {
      router.push('/(auth)/login');
    }
  };

  const resetLocalData = useCallback(async () => {
    if (isNative) {
      await cancelAllScheduledNotifications();
      await clearReminderSeriesConfigs();
      await clearAllTables();
      resetCursors();
      await resetBadgeCount();
      await checkDatabaseData();
      useSyncStore.getState().setQueueSize(0);
    }
    clearNotificationPreferences();
  }, [checkDatabaseData, isNative]);

  const handleResetAppData = useCallback(async () => {
    if (isResettingAllData) return;

    setResetStatus(null);
    const userId = session?.user?.id ?? null;

    if (!userId) {
      try {
        setIsResettingAllData(true);
        setResetStatus(t('settings.resetInProgress'));
        await resetLocalData();
        setPendingRemoteReset(true);
        setResetStatus(t('settings.resetSuccessLocal'));
        router.replace('/(auth)/login');
      } catch (error) {
        settingsLogger.error('Reset local data failed:', error);
        const { friendly } = showFriendlyError(error, {
          surface: 'settings.reset-app',
          suppressToast: true,
        });
        const message =
          friendly.description ??
          (friendly.descriptionKey ? t(friendly.descriptionKey) : friendly.originalMessage) ??
          (friendly.titleKey ? t(friendly.titleKey) : t('errors.unknown.title'));
        setResetStatus(message);
      } finally {
        setIsResettingAllData(false);
        setResetModalOpen(false);
      }
      return;
    }

    try {
      setIsResettingAllData(true);
      setIsSigningOut(true);
      setResetStatus(t('settings.resetInProgress'));
      await deleteRemoteUserData(userId);
      clearPendingRemoteReset();
      await resetLocalData();
      await signOut();
      setResetStatus(t('settings.resetSuccess'));
      router.replace('/(auth)/login');
    } catch (error) {
      settingsLogger.error('Reset app data failed:', error);
      const { friendly } = showFriendlyError(error, {
        surface: 'settings.reset-app',
        suppressToast: true,
      });
      const message =
        friendly.description ??
        (friendly.descriptionKey ? t(friendly.descriptionKey) : friendly.originalMessage) ??
        (friendly.titleKey ? t(friendly.titleKey) : t('errors.unknown.title'));
      setResetStatus(message);
    } finally {
      setIsResettingAllData(false);
      setResetModalOpen(false);
      setIsSigningOut(false);
    }
  }, [
    isResettingAllData,
    session?.user?.id,
    settingsLogger,
    showFriendlyError,
    signOut,
    router,
    t,
    resetLocalData,
  ]);

  const accountDescription =
    status === 'authenticated' && session?.user?.email
      ? t('settings.accountSignedInDescription').replace('{{email}}', session.user.email)
      : t('settings.accountSignInDescription');

  return (
    <>
      <UserOnly>
        <ScreenContainer gap="$5">
          <SettingsSection
            title={t('settings.accountTitle')}
            description={accountDescription}
            descriptionTestID="settings-account-description"
          >
            <PrimaryButton
              testID="settings-auth-button"
              disabled={isLoading}
              onPress={handleAuthAction}
            >
              {isLoading
                ? t('settings.loading')
                : status === 'authenticated'
                  ? t('settings.signOut')
                  : t('settings.signIn')}
            </PrimaryButton>
            {status === 'authenticated' ? (
              <SecondaryButton
                testID="settings-profile-button"
                onPress={() => router.push('/(tabs)/settings/profile')}
              >
                {t('settings.profileEditAction')}
              </SecondaryButton>
            ) : null}
          </SettingsSection>

          {status === 'authenticated' ? (
            <>
              <SettingsSection
                title={t('settings.resetTitle')}
                description={t('settings.resetDescription')}
                footer={resetStatus ?? undefined}
              >
                <SecondaryButton
                  testID="settings-reset-app-button"
                  disabled={isResettingAllData}
                  onPress={() => setResetModalOpen(true)}
                >
                  {isResettingAllData ? t('settings.resetInProgress') : t('settings.resetAction')}
                </SecondaryButton>
              </SettingsSection>
              <Dialog
                modal
                open={resetModalOpen}
                onOpenChange={(open) => {
                  if (!isResettingAllData) {
                    setResetModalOpen(open);
                  }
                }}
              >
                <Dialog.Portal>
                  <Dialog.Overlay key="reset-data-overlay" />
                  <Dialog.Content key="reset-data-content" bordered elevate>
                    <YStack gap="$3">
                      <Dialog.Title>{t('settings.resetConfirmTitle')}</Dialog.Title>
                      <Dialog.Description>
                        {t('settings.resetConfirmDescription')}
                      </Dialog.Description>
                      <XStack gap="$3" paddingTop="$2">
                        <SecondaryButton
                          width="auto"
                          flex={1}
                          disabled={isResettingAllData}
                          onPress={() => setResetModalOpen(false)}
                        >
                          {t('settings.resetCancel')}
                        </SecondaryButton>
                        <PrimaryButton
                          testID="settings-reset-confirm-button"
                          width="auto"
                          flex={1}
                          backgroundColor="$dangerColor"
                          pressStyle={{ backgroundColor: '$dangerColor' }}
                          disabled={isResettingAllData}
                          onPress={handleResetAppData}
                        >
                          {isResettingAllData ? (
                            <Spinner size="small" color="$dangerColor" />
                          ) : (
                            t('settings.resetConfirmAction')
                          )}
                        </PrimaryButton>
                      </XStack>
                    </YStack>
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog>
            </>
          ) : null}
        </ScreenContainer>
      </UserOnly>
      {isSigningOut || isResettingAllData ? (
        <YStack
          position="absolute"
          top={0}
          right={0}
          bottom={0}
          left={0}
          alignItems="center"
          justifyContent="center"
          backgroundColor="rgba(0,0,0,0.2)"
        >
          <Spinner size="large" color="$accentColor" />
        </YStack>
      ) : null}
      <ToastContainer messages={toast.messages} dismiss={toast.dismiss} />
    </>
  );
}
