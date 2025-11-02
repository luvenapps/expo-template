import { useSessionStore } from '@/auth/session';
import { pullUpdates, pushOutbox, useSync } from '@/sync';
import { PrimaryButton, ScreenContainer } from '@/ui';
import { useThemeContext, type ThemeName } from '@/ui/theme/ThemeProvider';
import { Monitor, Moon, Sun } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import type { ComponentType } from 'react';
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
  const syncDisabledMessage = !isNative
    ? 'Background sync requires the iOS or Android app to access the local database.'
    : status !== 'authenticated'
      ? 'Sign in to enable syncing with your Supabase account.'
      : null;
  const isSyncing = syncStatus === 'syncing';
  const { theme: themePreference, setTheme } = useThemeContext();

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

  const handleThemeSelection = (value: ThemeName) => {
    setTheme(value);
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
    <>
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
