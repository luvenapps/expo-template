import { useSessionStore } from '@/auth/session';
import { DOMAIN } from '@/config/domain.config';
import {
  createDeviceLocal,
  createEntryLocal,
  createPrimaryEntityLocal,
  createReminderLocal,
} from '@/data';
import { clearAllTables, getDb, hasData } from '@/db/sqlite';
import { onDatabaseReset } from '@/db/sqlite/events';
import { withDatabaseRetry } from '@/db/sqlite/retry';
import { useSyncStore } from '@/state';
import { pullUpdates, pushOutbox, useSync } from '@/sync';
import { clearAll as clearOutbox, getPending } from '@/sync/outbox';
import {
  CalendarHeatmap,
  PrimaryButton,
  ScreenContainer,
  SecondaryButton,
  SettingsSection,
  SliderField,
  StatCard,
  StreakChart,
} from '@/ui';
import { useThemeContext, type ThemeName } from '@/ui/theme/ThemeProvider';
import { Calendar, Flame, Monitor, Moon, RefreshCw, Sun } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import type { ComponentType } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Button, Paragraph, Progress, Switch, XStack, YStack } from 'tamagui';
import { useNotificationSettings } from '@/notifications/useNotificationSettings';
import { scheduleReminder } from '@/notifications/scheduler';

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
  const canSync = isNative && status === 'authenticated';
  const showDevTools =
    isNative && Boolean((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__);
  const [devStatus, setDevStatus] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [hasDbData, setHasDbData] = useState(false);
  const {
    remindersEnabled,
    dailySummaryEnabled,
    quietHours,
    permissionStatus,
    statusMessage: notificationStatusMessage,
    error: notificationError,
    isSupported: notificationsSupported,
    isChecking: isCheckingNotifications,
    toggleReminders,
    toggleDailySummary,
    updateQuietHours,
  } = useNotificationSettings();
  const hasOutboxData = queueSize > 0; // Use sync store's queue size instead of manual check
  const isSeedingRef = useRef(false); // Synchronous lock to prevent rapid-clicking (state updates are async)
  const isClearingRef = useRef(false); // Synchronous lock for clear operations
  const syncDisabledMessage = !isNative
    ? 'Background sync requires the iOS or Android app to access the local database.'
    : status !== 'authenticated'
      ? 'Sign in to enable syncing with your Supabase account.'
      : null;
  const isSyncing = syncStatus === 'syncing';
  const { theme: themePreference, setTheme, palette } = useThemeContext();
  const accentHex = palette.accent;
  const hasSession = Boolean(session?.user?.id);

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
    if (isNative && hasSession) {
      checkDatabaseData();
    }
  }, [isNative, hasSession, checkDatabaseData]);

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
    if (!canSync) return;
    await triggerSync();
    // Refresh database check after sync (may have pulled new data)
    // Note: queueSize updates automatically via sync store
    await checkDatabaseData();
  };

  const handleThemeSelection = (value: ThemeName) => {
    setTheme(value);
  };

  const handleSeedSampleData = async () => {
    if (!isNative) return;
    if (!hasSession) {
      setDevStatus('Sign in on a native build to seed local data.');
      return;
    }

    // Synchronous lock check (ref updates immediately, unlike state)
    if (isSeedingRef.current) {
      console.log('[Settings] Seed operation already in progress, ignoring click');
      return;
    }

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

          const reminderInput: Record<string, unknown> = {
            userId,
            timeLocal: '09:00',
            daysOfWeek: '1,2,3',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC',
            isEnabled: true,
          };
          reminderInput[DOMAIN.entities.reminders.foreignKey] = primaryEntity.id;

          await createReminderLocal(reminderInput as any, { database: tx });

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

      setDevStatus(
        `Seeded sample data locally (entity ${primary.id.slice(0, 8)}…). Run "Sync now" to push.`,
      );
      // Refresh database check and manually update queue size
      await checkDatabaseData();
      // Update queue size in sync store so buttons reflect outbox state
      const pending = await getPending();
      useSyncStore.getState().setQueueSize(pending.length);
    } catch (error) {
      console.error('[Settings] Seed sample data failed:', error);
      setDevStatus(`Error: ${(error as Error).message}`);
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
      // Update queue size to 0 (outbox is now empty)
      useSyncStore.getState().setQueueSize(0);
    } catch (error) {
      setDevStatus((error as Error).message);
    }
  };

  const handleTestReminder = async () => {
    if (!notificationsSupported) {
      setDevStatus('Reminders are unavailable on this platform.');
      return;
    }
    setDevStatus('Scheduling test reminder...');
    const fireDate = new Date(Date.now() + 60 * 1000);
    try {
      const id = await scheduleReminder(
        {
          id: `dev-test-${Date.now()}`,
          title: 'Better Habits Reminder',
          body: 'This is a test reminder (arrives in ~1 minute).',
          fireDate,
        },
        { quietHours },
      );
      if (!id) {
        setDevStatus('Unable to schedule reminder. Check notification permissions.');
        return;
      }
      setDevStatus('Test reminder scheduled. Check your notifications in ~1 minute.');
    } catch (reminderError) {
      console.error('[Settings] scheduleReminder failed', reminderError);
      setDevStatus('Failed to schedule reminder.');
    }
  };

  const handleClearLocalDatabase = async () => {
    if (!isNative) return;

    // Synchronous lock check (ref updates immediately, unlike state)
    if (isClearingRef.current) {
      console.log('[Settings] Clear operation already in progress, ignoring click');
      return;
    }

    try {
      isClearingRef.current = true;
      setIsClearing(true);
      setDevStatus('Clearing local database...');
      await clearAllTables();
      setDevStatus('Local database cleared successfully.');
      // Refresh database check and update queue size (both are now empty)
      await checkDatabaseData();
      useSyncStore.getState().setQueueSize(0);
    } catch (error) {
      console.error('[Settings] Clear local database failed:', error);
      setDevStatus(`Error: ${(error as Error).message}`);
    } finally {
      setIsClearing(false);
      isClearingRef.current = false;
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
  const STREAK_SAMPLE = [
    { label: 'Daily review', value: 4, max: 7, icon: <Flame size={16} color="$accentColor" /> },
    { label: 'Focus block', value: 3, max: 5 },
    { label: 'Wind-down', value: 2, max: 4 },
  ];
  const HEATMAP_SAMPLE = [
    [0, 1, 2, 3, 1, 0, 2],
    [1, 2, 3, 4, 2, 1, 0],
    [0, 1, 3, 4, 3, 2, 1],
    [1, 0, 2, 3, 4, 2, 1],
  ];

  const notificationStatusCopy = useMemo(() => {
    if (!notificationsSupported) {
      return 'Notifications are unavailable on this platform.';
    }

    switch (permissionStatus) {
      case 'granted':
        return 'Notifications are enabled for this device.';
      case 'prompt':
        return 'Enable notifications to receive reminders.';
      case 'denied':
        return 'Notifications are currently denied.';
      case 'blocked':
        return 'Notifications are blocked in system settings.';
      case 'unavailable':
      default:
        return 'Notifications are unavailable on this platform.';
    }
  }, [notificationsSupported, permissionStatus]);

  return (
    <ScreenContainer contentContainerStyle={{ flexGrow: 1, paddingBottom: 96 }}>
      <YStack gap="$4">
        <SettingsSection
          title="Account"
          description={
            status === 'authenticated' && session?.user?.email
              ? `Signed in as ${session.user.email}`
              : 'Sign in to sync your data across devices.'
          }
        >
          <PrimaryButton
            marginBottom={isNative ? '$5' : ''}
            disabled={isLoading}
            onPress={handleAuthAction}
          >
            {isLoading ? 'Loading…' : status === 'authenticated' ? 'Sign Out' : 'Sign In'}
          </PrimaryButton>
        </SettingsSection>

        <SettingsSection title="Theme" description="Select a theme on this device.">
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
                  aria-label={label}
                  onPress={() => handleThemeSelection(value)}
                >
                  <Icon size={20} color={isActive ? 'white' : undefined} />
                </Button>
              );
            })}
          </XStack>
        </SettingsSection>

        <SettingsSection
          title="Notifications"
          description="Control reminder prompts and daily summaries."
          footer={notificationError ?? notificationStatusMessage ?? undefined}
        >
          <YStack gap="$4">
            <XStack alignItems="center" justifyContent="space-between">
              <YStack gap="$1" flex={1} paddingRight="$3">
                <Paragraph fontWeight="600">Reminders</Paragraph>
                <Paragraph color="$colorMuted" fontSize="$3">
                  Send push notifications when it’s time to log progress.
                </Paragraph>
              </YStack>
              <Switch
                disabled={!notificationsSupported || isCheckingNotifications}
                checked={remindersEnabled}
                onCheckedChange={(checked) => toggleReminders(Boolean(checked))}
              >
                <Switch.Thumb />
              </Switch>
            </XStack>

            <XStack alignItems="center" justifyContent="space-between">
              <YStack gap="$1" flex={1} paddingRight="$3">
                <Paragraph fontWeight="600">Daily summary</Paragraph>
                <Paragraph color="$colorMuted" fontSize="$3">
                  Receive a brief recap of streaks.
                </Paragraph>
              </YStack>
              <Switch
                disabled={!notificationsSupported || permissionStatus === 'blocked'}
                checked={dailySummaryEnabled}
                onCheckedChange={(checked) => toggleDailySummary(Boolean(checked))}
              >
                <Switch.Thumb />
              </Switch>
            </XStack>

            <SliderField
              label="Quiet hours"
              value={quietHours}
              onValueChange={updateQuietHours}
              min={0}
              max={24}
              step={1}
              helperText="Reminders snoozed during these hours"
            />
            <Paragraph color="$colorMuted" fontSize="$3">
              {notificationStatusCopy}
            </Paragraph>
            {notificationStatusMessage ? (
              <Paragraph color="$colorMuted" fontSize="$3">
                {notificationStatusMessage}
              </Paragraph>
            ) : null}
            {notificationError ? (
              <Paragraph color="$dangerColor" fontSize="$3">
                {notificationError}
              </Paragraph>
            ) : null}
          </YStack>
        </SettingsSection>

        <SettingsSection
          title="Streak preview"
          description="Quick look at upcoming streaks (placeholder until main UI lands)."
        >
          <StreakChart data={STREAK_SAMPLE} />
        </SettingsSection>

        <SettingsSection
          title="Calendar preview"
          description="Consistency heatmap placeholder for upcoming habit flows."
        >
          <CalendarHeatmap weeks={HEATMAP_SAMPLE.length} values={HEATMAP_SAMPLE} />
        </SettingsSection>

        {isNative && (
          <>
            <SettingsSection
              title="Sync & Storage"
              description="Review local queue status and run a manual sync with Supabase."
              footer={syncDisabledMessage}
            >
              <XStack gap="$2" flexWrap="wrap">
                <StatCard
                  flex={1}
                  label="Queue size"
                  value={queueSize}
                  helperText={hasOutboxData ? 'Pending sync' : 'Outbox empty'}
                  icon={<RefreshCw size={14} color="$accentColor" />}
                />
                <StatCard
                  flex={1}
                  label="Last synced"
                  value={lastSyncedAt ? new Date(lastSyncedAt).toLocaleDateString() : 'Never'}
                  helperText={
                    lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : undefined
                  }
                  icon={<Calendar size={14} color="$accentColor" />}
                />
              </XStack>
              <Paragraph color="$colorMuted" textAlign="center">
                Status: {syncStatus.toUpperCase()}
              </Paragraph>
              <YStack gap="$1">
                <Paragraph fontWeight="600">
                  Outbox queue • {Math.round(queuePercent * 100)}%
                </Paragraph>
                <Progress value={queuePercent * 100} size="$3" height={18}>
                  <Progress.Indicator backgroundColor="$accentColor" />
                </Progress>
                <Paragraph color="$colorMuted" fontSize="$3">
                  {queueSize} pending item{queueSize === 1 ? '' : 's'} waiting
                </Paragraph>
              </YStack>
              <Paragraph color="$colorMuted" textAlign="center">
                Last synced: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Never'}
              </Paragraph>
              {lastError ? (
                <Paragraph color="$colorMuted" textAlign="center">
                  Last error: {lastError}
                </Paragraph>
              ) : null}
              <XStack>
                <PrimaryButton
                  size="$5"
                  disabled={!canSync || isSyncing || !hasOutboxData}
                  onPress={handleManualSync}
                >
                  {isSyncing ? 'Syncing…' : 'Sync now'}
                </PrimaryButton>
              </XStack>
            </SettingsSection>

            {showDevTools ? (
              <SettingsSection
                title="Developer Utilities"
                description="Seed and clear local data for manual testing on native builds."
                footer={devStatus ?? undefined}
              >
                <XStack>
                  <PrimaryButton
                    disabled={!hasSession || isSeeding || isSyncing}
                    onPress={handleSeedSampleData}
                  >
                    {isSeeding ? 'Seeding…' : 'Seed sample data'}
                  </PrimaryButton>
                </XStack>

                <XStack>
                  <SecondaryButton
                    disabled={!hasSession || !hasOutboxData}
                    onPress={handleClearOutbox}
                  >
                    Clear outbox
                  </SecondaryButton>
                </XStack>
                <XStack>
                  <SecondaryButton
                    disabled={!hasSession || isClearing || !hasDbData}
                    onPress={handleClearLocalDatabase}
                  >
                    {isClearing ? 'Clearing…' : 'Clear local database'}
                  </SecondaryButton>
                </XStack>
                <XStack>
                  <SecondaryButton disabled={!notificationsSupported} onPress={handleTestReminder}>
                    Schedule test reminder
                  </SecondaryButton>
                </XStack>
              </SettingsSection>
            ) : null}
          </>
        )}

        <Paragraph textAlign="center" color="$colorMuted" marginBottom="$4">
          Additional settings will arrive alongside theme controls and data export.
        </Paragraph>
      </YStack>
    </ScreenContainer>
  );
}
