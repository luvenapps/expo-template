import { Stack, useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { Paragraph, YStack } from 'tamagui';
import { PrimaryButton, ScreenContainer } from '@/ui';
import { useSessionStore } from '@/auth/session';
import { useSync, pushOutbox, pullUpdates } from '@/sync';

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
  const syncDisabledMessage = !isNative
    ? 'Background sync requires the iOS or Android app to access the local database.'
    : status !== 'authenticated'
      ? 'Sign in to enable syncing with your Supabase account.'
      : null;
  const isSyncing = syncStatus === 'syncing';

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
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Settings', headerShown: true }} />
      <ScreenContainer gap="$4">
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
                disabled={!canSync || isSyncing}
                onPress={handleManualSync}
                marginBottom="$4"
              >
                {isSyncing ? 'Syncing…' : 'Sync now'}
              </PrimaryButton>
            </YStack>

            <YStack height="$1" backgroundColor="$borderColor" marginVertical="$4" />
          </>
        )}

        <Paragraph textAlign="center" color="$colorMuted">
          Additional settings will arrive alongside theme controls and data export.
        </Paragraph>
      </ScreenContainer>
    </>
  );
}
