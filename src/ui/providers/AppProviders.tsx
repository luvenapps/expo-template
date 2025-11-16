import { initSessionListener, useSessionStore } from '@/auth/session';
import {
  registerNotificationCategories,
  configureNotificationHandler,
  resetBadgeCount,
} from '@/notifications';
import { getQueryClient, getQueryClientPersistOptions } from '@/state';
import { pullUpdates, pushOutbox, useSync } from '@/sync';
import { useThemeContext } from '@/ui/theme/ThemeProvider';
import { QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { StatusBar } from 'expo-status-bar';
import { PropsWithChildren, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';
import { AnalyticsProvider } from '@/observability/AnalyticsProvider';
import { ForegroundReminderToastHost } from '@/notifications/ForegroundReminderToastHost';
import { cleanupSoftDeletedRecords } from '@/db/sqlite/cleanup';
import { archiveOldEntries } from '@/db/sqlite/archive';

const queryClient = getQueryClient();
const persistOptions = getQueryClientPersistOptions();
const isWeb = Platform.OS === 'web';

export function AppProviders({ children }: PropsWithChildren) {
  const sessionStatus = useSessionStore((state) => state.status);
  const isAuthenticated = sessionStatus === 'authenticated';
  const syncEnabled = Platform.OS !== 'web' && isAuthenticated;
  const { resolvedTheme, palette } = useThemeContext();

  useEffect(() => {
    initSessionListener();
    registerNotificationCategories().catch(() => undefined);
    configureNotificationHandler().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return undefined;
    }

    const clearBadge = () => {
      resetBadgeCount().catch(() => undefined);
    };

    clearBadge();
    const subscription = AppState.addEventListener?.('change', (state) => {
      if (state === 'active') {
        clearBadge();
      }
    });

    return () => {
      subscription?.remove?.();
    };
  }, []);

  const { status: syncStatus, queueSize } = useSync({
    push: pushOutbox,
    pull: pullUpdates,
    enabled: syncEnabled,
    autoStart: syncEnabled,
    backgroundInterval: 15 * 60,
  });

  const lastCleanupRef = useRef(0);
  const lastArchiveRef = useRef(0);
  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    if (queueSize > 0 || syncStatus === 'syncing') {
      return;
    }

    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;
    if (now - lastCleanupRef.current < DAY_MS) {
      return;
    }

    lastCleanupRef.current = now;
    cleanupSoftDeletedRecords()
      .then((removed) => {
        if (removed > 0) {
          console.log(`[SQLite] Cleaned up ${removed} soft-deleted records`);
        }
      })
      .catch((error) => {
        console.error('[SQLite] Soft-delete cleanup failed:', error);
      });

    if (now - lastArchiveRef.current >= 7 * DAY_MS) {
      lastArchiveRef.current = now;
      archiveOldEntries()
        .then((archived) => {
          if (archived > 0) {
            console.log(`[SQLite] Archived ${archived} entries older than 2 years`);
          }
        })
        .catch((error) => {
          console.error('[SQLite] Archive routine failed:', error);
        });
    }
  }, [queueSize, syncStatus]);

  return (
    <AnalyticsProvider>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.background }}>
        <ForegroundReminderToastHost />
        <SafeAreaProvider>
          {isWeb && persistOptions ? (
            <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
              <AppContent resolvedTheme={resolvedTheme}>{children}</AppContent>
            </PersistQueryClientProvider>
          ) : (
            <QueryClientProvider client={queryClient}>
              <AppContent resolvedTheme={resolvedTheme}>{children}</AppContent>
            </QueryClientProvider>
          )}
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AnalyticsProvider>
  );
}

function AppContent({ children, resolvedTheme }: PropsWithChildren<{ resolvedTheme: string }>) {
  return (
    <>
      <YStack flex={1} backgroundColor="$background" testID="app-root-container">
        {children}
      </YStack>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}
