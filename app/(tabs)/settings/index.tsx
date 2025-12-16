/* istanbul ignore file */ // This file will change
import { useSessionStore } from '@/auth/session';
import { DOMAIN } from '@/config/domain.config';
import { createDeviceLocal, createEntryLocal, createPrimaryEntityLocal } from '@/data';
import { clearAllTables, getDb, hasData } from '@/db/sqlite';
import { archiveOldEntries } from '@/db/sqlite/archive';
import { onDatabaseReset } from '@/db/sqlite/events';
import { optimizeDatabase } from '@/db/sqlite/maintenance';
import { withDatabaseRetry } from '@/db/sqlite/retry';
import { useFriendlyErrorHandler } from '@/errors/useFriendlyErrorHandler';
import { setLanguage, supportedLanguages } from '@/i18n';
import { useNotificationSettings } from '@/notifications/useNotificationSettings';
import { useSyncStore } from '@/state';
import { pullUpdates, pushOutbox, useSync } from '@/sync';
import { resetCursors } from '@/sync/cursors';
import { clearAll as clearOutbox, getPending } from '@/sync/outbox';
import {
  CalendarHeatmap,
  PrimaryButton,
  ScreenContainer,
  SecondaryButton,
  SettingsSection,
  StatCard,
  StreakChart,
  ToastContainer,
  useToast,
} from '@/ui';
import { useThemeContext, type ThemeName } from '@/ui/theme/ThemeProvider';
import { Calendar, Flame, Monitor, Moon, RefreshCw, Sun } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import type { ComponentType } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Platform } from 'react-native';
import { Button, Paragraph, Progress, Switch, Text, View, XStack, YStack } from 'tamagui';

export default function SettingsScreen() {
  const router = useRouter();
  const status = useSessionStore((state) => state.status);
  const session = useSessionStore((state) => state.session);
  const signOut = useSessionStore((state) => state.signOut);
  const isLoading = useSessionStore((state) => state.isLoading);
  const {
    status: syncStatus,
    queueSize,
    lastSyncedAt,
    lastError,
    triggerSync,
  } = useSync({
    push: pushOutbox,
    pull: pullUpdates,
    enabled: false,
    autoStart: false,
  });
  const isNative = Platform.OS !== 'web';
  const isWeb = !isNative;
  const canSync = isNative && status === 'authenticated';
  const showDevTools =
    (globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ ??
    process.env.NODE_ENV !== 'production';
  const [devStatus, setDevStatus] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isOptimizingDb, setIsOptimizingDb] = useState(false);
  const [archiveOffsetDays, setArchiveOffsetDays] = useState<0 | -1>(0);
  const [, setHasDbData] = useState(false);
  const {
    permissionStatus,
    notificationStatus,
    tryPromptForPush,
    disablePushNotifications,
    error: notificationError,
    pushError,
    isChecking: isCheckingNotifications,
  } = useNotificationSettings();
  // Consider block state primarily from current OS/browser permission.
  // On web, a granted browser permission should always show the toggle even if prefs lag behind.
  const notificationsBlocked = isNative
    ? permissionStatus === 'blocked' ||
      permissionStatus === 'denied' ||
      permissionStatus === 'unavailable' ||
      notificationStatus === 'unavailable'
    : permissionStatus === 'blocked';
  const hasOutboxData = queueSize > 0; // Use sync store's queue size instead of manual check
  const isSeedingRef = useRef(false); // Synchronous lock to prevent rapid-clicking (state updates are async)
  const isClearingRef = useRef(false); // Synchronous lock for clear operations
  const toast = useToast();
  const { t, i18n } = useTranslation();
  const currentLanguage = (i18n.language ?? 'en').split('-')[0];
  const showFriendlyError = useFriendlyErrorHandler(toast);
  const syncDisabledMessage = !isNative
    ? t('settings.syncUnavailableWeb')
    : status !== 'authenticated'
      ? t('settings.syncUnavailableAuth')
      : null;
  const archiveOptions: { value: 0 | -1; label: string; helper: string }[] = [
    {
      value: 0,
      label: t('settings.archiveBeforeToday'),
      helper: t('settings.archiveBeforeTodayHelper'),
    },
    {
      value: -1,
      label: t('settings.archiveIncludeToday'),
      helper: t('settings.archiveIncludeTodayHelper'),
    },
  ];
  const archiveOptionHelper =
    archiveOptions.find((option) => option.value === archiveOffsetDays)?.helper ??
    t('settings.archiveBeforeTodayHelper');
  const isSyncing = syncStatus === 'syncing';
  const { theme: themePreference, setTheme, palette } = useThemeContext();
  const accentHex = palette.accent;
  const hasSession = Boolean(session?.user?.id);
  const pushEnabled = notificationStatus === 'granted';

  const pushStatusText = useMemo(() => {
    if (pushError) return pushError;
    if (notificationStatus === 'granted') return t('settings.pushStatusEnabledSimple');
    if (notificationStatus === 'denied' || notificationStatus === 'unavailable')
      return t('settings.pushStatusDisabledSimple');
    if (notificationStatus === 'soft-declined') return t('settings.pushStatusDisabledSimple');
    return t('settings.pushStatusDisabledSimple');
  }, [notificationStatus, pushError, t]);

  // cooldown info is handled internally; no inline display to avoid noise
  const streakSample = useMemo(
    () => [
      {
        label: t('settings.streakSampleDailyReview'),
        value: 4,
        max: 7,
        icon: <Flame size={16} color="$accentColor" />,
      },
      { label: t('settings.streakSampleFocus'), value: 3, max: 5 },
      { label: t('settings.streakSampleWindDown'), value: 2, max: 4 },
    ],
    [t],
  );
  const renderToggle = useCallback(
    ({
      checked,
      disabled,
      onChange,
      testID,
    }: {
      checked: boolean;
      disabled: boolean;
      onChange: (checked: boolean) => void;
      testID?: string;
    }) => (
      <View width={Platform.OS === 'web' ? 64 : 'auto'} alignItems="flex-end">
        <Switch
          testID={testID}
          size="$7"
          disabled={disabled}
          checked={checked}
          onCheckedChange={(val) => onChange(Boolean(val))}
          borderColor={Platform.OS === 'web' ? '$borderColor' : undefined}
          borderWidth={Platform.OS === 'web' ? 1 : undefined}
          backgroundColor={checked ? palette.accent : palette.secondaryBackground}
          pressStyle={{ opacity: 0.9 }}
        >
          <Switch.Thumb borderWidth={1} borderColor="$borderColor" />
        </Switch>
      </View>
    ),
    [palette],
  );

  const checkDatabaseData = useCallback(async () => {
    if (!isNative) return;
    try {
      const dataExists = await hasData();
      setHasDbData(dataExists);
    } catch (error) {
      console.error('[Settings] Error checking database data:', error);
      setHasDbData(false);
    }
  }, [isNative]);

  // Check for database data on mount and when session changes
  // Note: Outbox data is tracked via queueSize from sync store
  useEffect(() => {
    if (isNative) {
      checkDatabaseData();
    }
  }, [isNative, checkDatabaseData]);

  useEffect(() => {
    if (!isNative) return undefined;
    const unsubscribe = onDatabaseReset(() => {
      checkDatabaseData().catch(() => undefined);
      useSyncStore.getState().setQueueSize(0);
    });
    return unsubscribe;
  }, [isNative, checkDatabaseData]);

  const handleAuthAction = async () => {
    if (status === 'authenticated') {
      await signOut();
    } else {
      router.push('/(auth)/login');
    }
  };

  const handleManualSync = async () => {
    if (!canSync) {
      toast.show({
        type: 'info',
        title: 'Sync unavailable',
        description: syncDisabledMessage ?? 'Background sync runs only on native builds.',
      });
      return;
    }
    try {
      await triggerSync();
      await checkDatabaseData();
      toast.show({
        type: 'success',
        title: 'Sync started',
        description: 'We will notify you if an error occurs.',
      });
    } catch (syncError) {
      console.error('[Settings] manual sync failed', syncError);
      const { friendly } = showFriendlyError(syncError, { surface: 'settings.sync' });
      const message =
        friendly.description ??
        (friendly.descriptionKey ? t(friendly.descriptionKey) : friendly.originalMessage) ??
        (friendly.titleKey ? t(friendly.titleKey) : t('errors.unknown.title'));
      setDevStatus(message);
    }
  };

  const handleThemeSelection = (value: ThemeName) => {
    setTheme(value);
  };

  const handlePromptPush = async () => {
    const result = await tryPromptForPush('manual');

    if (result.status === 'triggered' || result.status === 'already-enabled') {
      toast.show({
        type: 'success',
        title: t('settings.pushStatusEnabledSimple'),
      });
      return;
    }

    if (result.status === 'cooldown') {
      toast.show({
        type: 'info',
        title: t('settings.pushCooldownTitle'),
        description: t('settings.pushCooldownDescription'),
      });
      return;
    }

    if (result.status === 'exhausted') {
      toast.show({
        type: 'info',
        title: t('settings.pushExhaustedTitle'),
        description: t('settings.pushExhaustedDescription'),
      });
      return;
    }

    if (result.status === 'denied') {
      toast.show({
        type: 'info',
        title: t('settings.pushUnavailableTitle'),
        description: t('settings.pushUnavailableDescription'),
      });
      return;
    }
  };

  const handleArchiveOldEntries = async () => {
    if (!isNative || isArchiving) return;
    try {
      setIsArchiving(true);
      setDevStatus('Archiving entries for testing...');
      const archived = await archiveOldEntries({ olderThanDays: archiveOffsetDays });
      await checkDatabaseData();
      toast.show({
        type: archived > 0 ? 'success' : 'info',
        title: archived > 0 ? 'Entries archived' : 'No entries to archive',
        description:
          archived > 0
            ? `${archived} entr${archived === 1 ? 'y' : 'ies'} were flagged as archived.`
            : 'All entries are newer than the archive threshold.',
      });
      setDevStatus(
        archived > 0
          ? `Archived ${archived} entr${archived === 1 ? 'y' : 'ies'} for manual validation.`
          : 'Archive complete. No qualifying entries found.',
      );
    } catch (error) {
      console.error('[Settings] archive entries failed', error);
      const { friendly } = showFriendlyError(error, { surface: 'settings.archive' });
      const message =
        friendly.description ??
        (friendly.descriptionKey ? t(friendly.descriptionKey) : friendly.originalMessage) ??
        (friendly.titleKey ? t(friendly.titleKey) : t('errors.unknown.title'));
      setDevStatus(message);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleSeedSampleData = async () => {
    if (!isNative) return;
    if (!hasSession) {
      setDevStatus('Sign in on a native build to seed local data.');
      return;
    }

    // Synchronous lock check (ref updates immediately, unlike state)
    if (isSeedingRef.current) return;

    try {
      isSeedingRef.current = true;
      setIsSeeding(true);
      setDevStatus('Seeding data...');
      const userId = session!.user!.id;

      const { primary } = await withDatabaseRetry(async () => {
        const database = await getDb();
        return database.transaction(async (tx: Awaited<ReturnType<typeof getDb>>) => {
          const primaryEntity = await createPrimaryEntityLocal(
            {
              userId,
              name: `Sample ${new Date().toLocaleTimeString()}`,
              cadence: 'daily',
              color: accentHex,
            },
            { database: tx },
          );

          const entryInput: Record<string, unknown> = {
            userId,
            date: new Date().toISOString().slice(0, 10),
            amount: 1,
          };
          entryInput[DOMAIN.entities.entries.foreignKey] = primaryEntity.id;

          await createEntryLocal(entryInput as any, { database: tx });

          await createDeviceLocal(
            {
              userId,
              platform: Platform.OS,
              lastSyncAt: new Date().toISOString(),
            },
            { database: tx },
          );

          return { primary: primaryEntity };
        });
      });

      const message = `Seeded sample data locally (entity ${primary.id.slice(0, 8)}…). Run "Sync now" to push.`;
      setDevStatus(message);
      toast.show({
        type: 'success',
        title: 'Seed completed',
        description: message,
      });
      // Refresh database check and manually update queue size
      await checkDatabaseData();
      // Update queue size in sync store so buttons reflect outbox state
      const pending = await getPending();
      useSyncStore.getState().setQueueSize(pending.length);
    } catch (error) {
      console.error('[Settings] Seed sample data failed:', error);
      const { friendly } = showFriendlyError(error, { surface: 'settings.seed' });
      const message =
        friendly.description ??
        (friendly.descriptionKey ? t(friendly.descriptionKey) : friendly.originalMessage) ??
        (friendly.titleKey ? t(friendly.titleKey) : t('errors.unknown.title'));
      setDevStatus(`Error: ${message}`);
    } finally {
      setIsSeeding(false);
      isSeedingRef.current = false;
    }
  };

  const handleClearOutbox = async () => {
    if (!isNative) return;
    try {
      setDevStatus(null);
      await clearOutbox();
      setDevStatus('Outbox cleared.');
      useSyncStore.getState().setQueueSize(0);
      toast.show({
        type: 'success',
        title: 'Outbox cleared',
      });
    } catch (error) {
      const { friendly } = showFriendlyError(error, { surface: 'settings.clear-outbox' });
      const message =
        friendly.description ??
        (friendly.descriptionKey ? t(friendly.descriptionKey) : friendly.originalMessage) ??
        (friendly.titleKey ? t(friendly.titleKey) : t('errors.unknown.title'));
      setDevStatus(message);
    }
  };

  const handleRegisterPush = async () => {
    const result = await tryPromptForPush('manual');
    if (result.status === 'triggered' || result.status === 'already-enabled') {
      setDevStatus('Push token requested (check console for logs).');
      return;
    }
    if (result.status === 'cooldown') {
      setDevStatus('Push prompt in cooldown.');
      return;
    }
    if (result.status === 'exhausted') {
      setDevStatus('Push attempts exhausted; enable via system settings.');
      return;
    }
    if (result.status === 'denied') {
      setDevStatus('Push permission denied. Enable in system settings.');
      return;
    }
    setDevStatus('Push registration unavailable on this platform.');
  };

  const handleClearLocalDatabase = async () => {
    if (!isNative) return;

    // Synchronous lock check (ref updates immediately, unlike state)
    if (isClearingRef.current) return;

    try {
      isClearingRef.current = true;
      setIsClearing(true);
      setDevStatus('Clearing local database...');
      await clearAllTables();
      resetCursors();
      setDevStatus('Local database cleared successfully.');
      // Refresh database check and update queue size (both are now empty)
      await checkDatabaseData();
      useSyncStore.getState().setQueueSize(0);
    } catch (error) {
      console.error('[Settings] Clear local database failed:', error);
      const { friendly } = showFriendlyError(error, { surface: 'settings.clear-db' });
      const message =
        friendly.description ??
        (friendly.descriptionKey ? t(friendly.descriptionKey) : friendly.originalMessage) ??
        (friendly.titleKey ? t(friendly.titleKey) : t('errors.unknown.title'));
      setDevStatus(`Error: ${message}`);
    } finally {
      setIsClearing(false);
      isClearingRef.current = false;
    }
  };

  const handleOptimizeDatabase = async () => {
    if (!isNative || isOptimizingDb) return;

    try {
      setIsOptimizingDb(true);
      setDevStatus('Optimizing database...');
      await optimizeDatabase();
      setDevStatus('Database optimized successfully.');
      toast.show({
        type: 'success',
        title: 'Database optimized',
        description: 'Reclaimed space and refreshed indexes.',
      });
    } catch (error) {
      console.error('[Settings] Optimize database failed:', error);
      const { friendly } = showFriendlyError(error, { surface: 'settings.optimize-db' });
      const message =
        friendly.description ??
        (friendly.descriptionKey ? t(friendly.descriptionKey) : friendly.originalMessage) ??
        (friendly.titleKey ? t(friendly.titleKey) : t('errors.unknown.title'));
      setDevStatus(`Error: ${message}`);
    } finally {
      setIsOptimizingDb(false);
    }
  };

  const THEME_OPTIONS: {
    value: ThemeName;
    label: string;
    Icon: ComponentType<{ size?: number; color?: string }>;
  }[] = [
    { value: 'system', label: 'Follow System', Icon: Monitor },
    { value: 'light', label: 'Light', Icon: Sun },
    { value: 'dark', label: 'Dark', Icon: Moon },
  ];
  const QUEUE_CAPACITY = 10;
  const queuePercent = Math.min(1, queueSize / QUEUE_CAPACITY);
  const formatStreakDay = useCallback(
    (value: number) =>
      (t as unknown as (k: string, opts?: Record<string, any>) => string)('settings.streakDays', {
        count: value,
        suffix: value === 1 ? '' : 's',
      }),
    [t],
  );

  const formatStreakPercent = useCallback(
    (percent: number) =>
      (t as unknown as (k: string, opts?: Record<string, any>) => string)(
        'settings.streakPercentComplete',
        { percent: Math.round(percent * 100) },
      ),
    [t],
  );

  const HEATMAP_SAMPLE = [
    [0, 1, 2, 3, 1, 0, 2],
    [1, 2, 3, 4, 2, 1, 0],
    [0, 1, 3, 4, 3, 2, 1],
    [1, 0, 2, 3, 4, 2, 1],
  ];

  const content = (
    <ScreenContainer contentContainerStyle={{ flexGrow: 1, paddingBottom: 96 }}>
      <YStack gap="$4">
        {(() => {
          const accountDescription =
            status === 'authenticated' && session?.user?.email
              ? t('settings.accountSignedInDescription').replace('{{email}}', session.user.email)
              : t('settings.accountSignInDescription');
          return (
            <SettingsSection
              title={t('settings.accountTitle')}
              description={accountDescription}
              descriptionTestID="settings-account-description"
            >
              <PrimaryButton
                testID="settings-auth-button"
                marginBottom={isNative ? '$5' : ''}
                disabled={isLoading}
                onPress={handleAuthAction}
              >
                {isLoading
                  ? t('settings.loading')
                  : status === 'authenticated'
                    ? t('settings.signOut')
                    : t('settings.signIn')}
              </PrimaryButton>
            </SettingsSection>
          );
        })()}

        <SettingsSection
          title={t('settings.languageTitle')}
          description={t('settings.languageDescription')}
        >
          <YStack gap="$2">
            {supportedLanguages.map((lang) => {
              const isActive = currentLanguage === lang.code;
              return (
                <Button
                  key={lang.code}
                  testID={`language-option-${lang.code}`}
                  aria-label={lang.label}
                  role="button"
                  size="$5"
                  height={48}
                  borderRadius="$3"
                  borderStyle="solid"
                  borderColor="$borderColor"
                  backgroundColor={isActive ? '$accentColor' : '$background'}
                  color={isActive ? 'white' : '$color'}
                  pressStyle={{
                    backgroundColor: isActive ? '$accentColor' : '$backgroundPress',
                  }}
                  hoverStyle={{
                    backgroundColor: isActive ? '$accentColor' : '$backgroundHover',
                  }}
                  disabled={isActive}
                  onPress={() => setLanguage(lang.code)}
                >
                  {lang.label}
                </Button>
              );
            })}
          </YStack>
        </SettingsSection>

        <SettingsSection title={t('settings.themeTitle')}>
          <XStack gap="$2">
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

        <SettingsSection
          title={t('settings.notificationsTitle')}
          description={t('settings.notificationsDescription')}
          footer={notificationsBlocked ? undefined : (notificationError ?? undefined)}
        >
          {notificationsBlocked ? (
            <YStack gap="$2" paddingTop="$1" paddingBottom="$5">
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
            <YStack gap="$4">
              <YStack gap="$3">
                <XStack alignItems="center" justifyContent="space-between">
                  <YStack gap="$1" flex={1} paddingRight="$3">
                    <Paragraph fontWeight="700">{t('settings.notificationsTitle')}</Paragraph>
                    <Paragraph color="$colorMuted" fontSize="$3" testID="settings-push-status">
                      {pushStatusText}
                    </Paragraph>
                  </YStack>
                  {renderToggle({
                    checked: pushEnabled,
                    disabled: notificationsBlocked || isCheckingNotifications,
                    onChange: async (checked) => {
                      if (checked) {
                        await handlePromptPush();
                      } else {
                        disablePushNotifications();
                      }
                    },
                    testID: 'settings-push-toggle',
                  })}
                </XStack>
              </YStack>
            </YStack>
          )}
        </SettingsSection>

        <SettingsSection
          title={t('settings.streakPreviewTitle')}
          description={t('settings.streakPreviewDescription')}
        >
          <StreakChart
            data={streakSample}
            formatDayLabel={formatStreakDay}
            formatPercentLabel={formatStreakPercent}
          />
        </SettingsSection>

        <SettingsSection
          title={t('settings.calendarPreviewTitle')}
          description={t('settings.calendarPreviewDescription')}
        >
          <CalendarHeatmap weeks={HEATMAP_SAMPLE.length} values={HEATMAP_SAMPLE} />
        </SettingsSection>

        {isNative && (
          <>
            <SettingsSection
              title={t('settings.syncStorageTitle')}
              description={t('settings.syncStorageDescription')}
              footer={syncDisabledMessage}
              testID="settings-sync-section"
              footerTestID={syncDisabledMessage ? 'settings-sync-disabled' : undefined}
            >
              <XStack gap="$2" flexWrap="wrap">
                <StatCard
                  flex={1}
                  label={t('settings.queueSize')}
                  value={queueSize}
                  helperText={
                    hasOutboxData
                      ? t('settings.queueHelperPending')
                      : t('settings.queueHelperEmpty')
                  }
                  icon={<RefreshCw size={14} color="$accentColor" />}
                />
                <StatCard
                  flex={1}
                  label={t('settings.lastSyncedLabel')}
                  value={
                    lastSyncedAt ? new Date(lastSyncedAt).toLocaleDateString() : t('settings.never')
                  }
                  helperText={
                    lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : undefined
                  }
                  icon={<Calendar size={14} color="$accentColor" />}
                />
              </XStack>
              <Paragraph color="$colorMuted" textAlign="center">
                {(t as unknown as (k: string, opts?: Record<string, any>) => string)(
                  'settings.statusLabel',
                  { status: syncStatus.toUpperCase() },
                )}
              </Paragraph>
              <YStack gap="$1">
                <Paragraph fontWeight="600">
                  {(t as unknown as (k: string, opts?: Record<string, any>) => string)(
                    'settings.outboxQueueLabel',
                    { percent: Math.round(queuePercent * 100) },
                  )}
                </Paragraph>
                <Progress value={queuePercent * 100} size="$3" height={18}>
                  <Progress.Indicator backgroundColor="$accentColor" />
                </Progress>
                <Paragraph color="$colorMuted" fontSize="$3">
                  {(t as unknown as (k: string, opts?: Record<string, any>) => string)(
                    'settings.pendingItems',
                    {
                      count: queueSize,
                      suffix: queueSize === 1 ? '' : 's',
                    },
                  )}
                </Paragraph>
              </YStack>
              <Paragraph color="$colorMuted" textAlign="center">
                {t('settings.lastSyncedLabel')}:{' '}
                {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : t('settings.never')}
              </Paragraph>
              {lastError ? (
                <Paragraph color="$colorMuted" textAlign="center">
                  {(t as unknown as (k: string, opts?: Record<string, any>) => string)(
                    'settings.lastErrorLabel',
                    { error: lastError },
                  )}
                </Paragraph>
              ) : null}
              <XStack>
                <PrimaryButton
                  size="$5"
                  disabled={!canSync || isSyncing}
                  onPress={handleManualSync}
                  testID="settings-sync-now"
                >
                  {isSyncing ? 'Syncing…' : 'Sync now'}
                </PrimaryButton>
              </XStack>
            </SettingsSection>
          </>
        )}
        {showDevTools ? (
          <>
            <SettingsSection title="Developer Utilities" footer={devStatus ?? undefined}>
              {isWeb && (
                <SecondaryButton testID="dev-register-push-button" onPress={handleRegisterPush}>
                  {t('dev.registerPush')}
                </SecondaryButton>
              )}

              {isNative && (
                <>
                  <XStack>
                    <PrimaryButton
                      testID="dev-seed-button"
                      disabled={!hasSession || isSeeding || isSyncing}
                      onPress={handleSeedSampleData}
                    >
                      {isSeeding ? 'Seeding…' : 'Seed sample data'}
                    </PrimaryButton>
                  </XStack>

                  <XStack>
                    <SecondaryButton
                      testID="dev-clear-outbox-button"
                      disabled={!hasSession || !hasOutboxData}
                      onPress={handleClearOutbox}
                    >
                      Clear outbox
                    </SecondaryButton>
                  </XStack>
                  <XStack>
                    <SecondaryButton
                      testID="dev-clear-db-button"
                      disabled={isClearing}
                      onPress={handleClearLocalDatabase}
                    >
                      {isClearing ? 'Clearing…' : 'Clear local database'}
                    </SecondaryButton>
                  </XStack>
                  <XStack>
                    <SecondaryButton
                      testID="dev-optimize-db-button"
                      disabled={isOptimizingDb}
                      onPress={handleOptimizeDatabase}
                    >
                      {isOptimizingDb ? 'Optimizing…' : 'Optimize database'}
                    </SecondaryButton>
                  </XStack>
                  <XStack>
                    <SecondaryButton onPress={() => router.push('/(tabs)/settings/database')}>
                      View local database
                    </SecondaryButton>
                  </XStack>
                  <XStack>
                    <SecondaryButton
                      testID="dev-register-push-button"
                      disabled={!isNative}
                      onPress={handleRegisterPush}
                    >
                      {t('dev.registerPush')}
                    </SecondaryButton>
                  </XStack>
                  <YStack gap="$2">
                    <XStack gap="$3" alignItems="center" justifyContent="space-between">
                      <SecondaryButton
                        disabled={isArchiving}
                        onPress={handleArchiveOldEntries}
                        flex={1}
                      >
                        {isArchiving ? 'Archiving…' : 'Archive'}
                      </SecondaryButton>
                      <YStack gap="$2" alignItems="center">
                        <Switch
                          testID="dev-archive-toggle"
                          size="$7"
                          disabled={isArchiving}
                          checked={archiveOffsetDays === -1}
                          onCheckedChange={(val) => setArchiveOffsetDays(val ? -1 : 0)}
                          borderColor={Platform.OS === 'web' ? '$borderColor' : undefined}
                          borderWidth={Platform.OS === 'web' ? 1 : undefined}
                          backgroundColor={
                            archiveOffsetDays === -1 ? palette.accent : palette.secondaryBackground
                          }
                          pressStyle={{ opacity: 0.9 }}
                        >
                          <Switch.Thumb borderWidth={1} borderColor="$borderColor" />
                        </Switch>
                        <Text fontSize="$3" color="$colorMuted">
                          {t('settings.archiveIncludeToday')}
                        </Text>
                      </YStack>
                    </XStack>
                    <Paragraph textAlign="center" color="$colorMuted" fontSize="$3">
                      {archiveOptionHelper}
                    </Paragraph>
                  </YStack>
                </>
              )}
            </SettingsSection>
          </>
        ) : null}

        <Paragraph
          textAlign="center"
          color="$colorMuted"
          marginBottom="$4"
          testID="settings-footer-note"
        >
          {t('settings.upcomingFeatures')}
        </Paragraph>
      </YStack>
    </ScreenContainer>
  );

  return (
    <>
      {content}
      <ToastContainer messages={toast.messages} dismiss={toast.dismiss} />
    </>
  );
}
