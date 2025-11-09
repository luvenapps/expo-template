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
import { PrimaryButton, ScreenContainer, SecondaryButton, SettingsSection } from '@/ui';
import { useThemeContext, type ThemeName } from '@/ui/theme/ThemeProvider';
import { Monitor, Moon, Sun } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import type { ComponentType } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Button, Paragraph, XStack, YStack } from 'tamagui';

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

        <SettingsSection title="Theme" description="Choose how Better Habits looks on this device.">
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
        </SettingsSection>

        {isNative && (
          <>
            <SettingsSection
              title="Sync & Storage"
              description="Review local queue status and run a manual sync with Supabase."
              footer={syncDisabledMessage}
            >
              <Paragraph color="$colorMuted" textAlign="center">
                Status: {syncStatus.toUpperCase()}
              </Paragraph>
              <Paragraph color="$colorMuted" textAlign="center">
                Queue size: {queueSize}
              </Paragraph>
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
