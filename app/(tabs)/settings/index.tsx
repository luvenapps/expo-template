import { useSessionStore } from '@/auth/session';
import { pullUpdates, pushOutbox, useSync } from '@/sync';
import { PrimaryButton, ScreenContainer, SecondaryButton } from '@/ui';
import { useThemeContext, type ThemeName } from '@/ui/theme/ThemeProvider';
import { Monitor, Moon, Sun } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import type { ComponentType } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, ScrollView } from 'react-native';
import { Button, Paragraph, XStack, YStack } from 'tamagui';
import {
  createDeviceLocal,
  createEntryLocal,
  createPrimaryEntityLocal,
  createReminderLocal,
} from '@/data';
import { clearAll as clearOutbox, getPending } from '@/sync/outbox';
import { useSyncStore } from '@/state';
import { DOMAIN } from '@/config/domain.config';
import { clearAllTables, getDb, hasData } from '@/db/sqlite';
import { withDatabaseRetry } from '@/db/sqlite/retry';
import { onDatabaseReset } from '@/db/sqlite/events';

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
  const hasOutboxData = queueSize > 0; // Use sync store's queue size instead of manual check
  const isSeedingRef = useRef(false); // Synchronous lock to prevent rapid-clicking (state updates are async)
  const isClearingRef = useRef(false); // Synchronous lock for clear operations
  const syncDisabledMessage = !isNative
    ? 'Background sync requires the iOS or Android app to access the local database.'
    : status !== 'authenticated'
      ? 'Sign in to enable syncing with your Supabase account.'
      : null;
  const isSyncing = syncStatus === 'syncing';
  const { theme: themePreference, setTheme } = useThemeContext();
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
              color: '#60a5fa',
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

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <YStack gap="$4">
          <YStack gap="$3" paddingVertical="$4">
            {status === 'authenticated' && session?.user?.email ? (
              <Paragraph textAlign="center" color="$colorMuted">
                Signed in as {session.user.email}
              </Paragraph>
            ) : (
              <Paragraph textAlign="center" color="$colorMuted">
                Sign in to sync your data across devices
              </Paragraph>
            )}
            <PrimaryButton disabled={isLoading} onPress={handleAuthAction}>
              {isLoading ? 'Loading…' : status === 'authenticated' ? 'Sign Out' : 'Sign In'}
            </PrimaryButton>
          </YStack>

          <YStack gap="$3" paddingVertical="$2">
            <Paragraph textAlign="center" fontWeight="600">
              Theme
            </Paragraph>
            <Paragraph textAlign="center" color="$colorMuted">
              Choose how the app looks on this device.
            </Paragraph>
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
                    backgroundColor={isActive ? '$accentColor' : '$backgroundStrong'}
                    color={isActive ? 'white' : '$color'}
                    pressStyle={{
                      backgroundColor: isActive ? '$accentColor' : '$backgroundPress',
                    }}
                    hoverStyle={{
                      backgroundColor: isActive ? '$accentColor' : '$backgroundHover',
                    }}
                    disabled={isActive}
                    accessibilityLabel={label}
                    onPress={() => handleThemeSelection(value)}
                  >
                    <Icon size={20} color={isActive ? 'white' : undefined} />
                  </Button>
                );
              })}
            </XStack>
          </YStack>

          {isNative && (
            <>
              <YStack height="$1" backgroundColor="$borderColor" marginVertical="$4" />

              <YStack gap="$3">
                <Paragraph textAlign="center" fontWeight="600">
                  Sync Status: {syncStatus.toUpperCase()}
                </Paragraph>
                <Paragraph textAlign="center" color="$colorMuted">
                  Queue size: {queueSize}
                </Paragraph>
                <Paragraph textAlign="center" color="$colorMuted">
                  Last synced: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Never'}
                </Paragraph>
                {lastError ? (
                  <Paragraph textAlign="center" color="$colorMuted">
                    Last error: {lastError}
                  </Paragraph>
                ) : null}
                {syncDisabledMessage ? (
                  <Paragraph textAlign="center" color="$colorMuted">
                    {syncDisabledMessage}
                  </Paragraph>
                ) : null}
                <PrimaryButton
                  size="$5"
                  disabled={!canSync || isSyncing || !hasOutboxData}
                  onPress={handleManualSync}
                  marginBottom="$4"
                >
                  {isSyncing ? 'Syncing…' : 'Sync now'}
                </PrimaryButton>
              </YStack>

              <YStack height="$1" backgroundColor="$borderColor" marginVertical="$4" />

              {showDevTools && (
                <YStack gap="$3" marginBottom="$4">
                  <Paragraph textAlign="center" fontWeight="600">
                    Developer Tools (local-only)
                  </Paragraph>
                  <Paragraph textAlign="center" color="$colorMuted">
                    Seeds sample records in SQLite and queues them for sync. Intended for manual
                    testing on native builds.
                  </Paragraph>
                  <PrimaryButton
                    disabled={!hasSession || isSeeding || isSyncing}
                    onPress={handleSeedSampleData}
                  >
                    {isSeeding ? 'Seeding…' : 'Seed sample data'}
                  </PrimaryButton>
                  <SecondaryButton
                    disabled={!hasSession || !hasOutboxData}
                    onPress={handleClearOutbox}
                  >
                    Clear outbox
                  </SecondaryButton>
                  <SecondaryButton
                    disabled={!hasSession || isClearing || !hasDbData}
                    onPress={handleClearLocalDatabase}
                  >
                    {isClearing ? 'Clearing…' : 'Clear local database'}
                  </SecondaryButton>
                  {devStatus ? (
                    <Paragraph textAlign="center" color="$colorMuted">
                      {devStatus}
                    </Paragraph>
                  ) : null}
                  <YStack height="$1" backgroundColor="$borderColor" marginVertical="$4" />
                </YStack>
              )}
            </>
          )}

          <Paragraph textAlign="center" color="$colorMuted" marginBottom="$4">
            Additional settings will arrive alongside theme controls and data export.
          </Paragraph>
        </YStack>
      </ScrollView>
    </ScreenContainer>
  );
}
