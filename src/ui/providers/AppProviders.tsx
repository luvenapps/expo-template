import { initSessionListener, useSessionStore } from '@/auth/session';
import {
  registerNotificationCategories,
  configureNotificationHandler,
  resetBadgeCount,
  initializeInAppMessaging,
  setMessageTriggers,
  initializeFCMListeners,
} from '@/notifications';
import { ensureServiceWorkerRegistered } from '@/notifications/firebasePush';
import { onNotificationEvent } from '@/notifications/notificationEvents';
import { useNotificationSettings } from '@/notifications/useNotificationSettings';
import { getQueryClient, getQueryClientPersistOptions } from '@/state';
import { pullUpdates, pushOutbox, useSync } from '@/sync';
import { useThemeContext } from '@/ui/theme/ThemeProvider';
import { SoftPromptModal } from '@/ui/components/SoftPromptModal';
import { QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import * as Notifications from 'expo-notifications';
import { useRouter, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PropsWithChildren, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';
import { AnalyticsProvider } from '@/observability/AnalyticsProvider';
import { ForegroundReminderAnalyticsHost } from '@/notifications/ForegroundReminderAnalyticsHost';
import { cleanupSoftDeletedRecords } from '@/db/sqlite/cleanup';
import { archiveOldEntries } from '@/db/sqlite/archive';
import { optimizeDatabase } from '@/db/sqlite/maintenance';
import i18n from '@/i18n';
import { I18nextProvider } from 'react-i18next';
import { NOTIFICATIONS } from '@/config/constants';
import { DOMAIN } from '@/config/domain.config';
import { createLogger } from '@/observability/logger';
import { analytics } from '@/observability/analytics';

const queryClient = getQueryClient();
const persistOptions = getQueryClientPersistOptions();
const isWeb = Platform.OS === 'web';
const iamLogger = createLogger('IAM');
const appLogger = createLogger('AppProviders');
const dbLogger = createLogger('SQLite');

export function AppProviders({ children }: PropsWithChildren) {
  const router = useRouter();
  const sessionStatus = useSessionStore((state) => state.status);
  const isAuthenticated = sessionStatus === 'authenticated';
  const syncEnabled = Platform.OS !== 'web' && isAuthenticated;
  const { resolvedTheme, palette } = useThemeContext();
  const [isAppReady, setIsAppReady] = useState(false);
  const { tryPromptForPush, softPrompt } = useNotificationSettings();
  const turnOnFirebase = useMemo(
    () =>
      process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === 'true' ||
      process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === '1',
    [],
  );

  useEffect(() => {
    const initialize = async () => {
      initSessionListener();
      await Promise.all([
        registerNotificationCategories().catch(() => undefined),
        configureNotificationHandler().catch(() => undefined),
        turnOnFirebase ? initializeInAppMessaging().catch(() => undefined) : undefined,
      ]);
      // Mark app as ready after core initialization completes
      setIsAppReady(true);
    };

    initialize().catch(() => undefined);

    // Initialize FCM message listeners for push notifications
    let unsubscribeFCM: (() => void) | undefined;
    if (turnOnFirebase) {
      unsubscribeFCM = initializeFCMListeners();
    }
    return () => {
      unsubscribeFCM?.();
    };
  }, [turnOnFirebase]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return undefined;
    }

    const handledInitialResponseRef = { current: false };

    const handleNotificationResponse = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const data = response.notification.request.content.data ?? {};
      const notificationId =
        (typeof data.notificationId === 'string' && data.notificationId) ||
        (typeof data.messageId === 'string' && data.messageId) ||
        response.notification.request.identifier;
      const reminderId = typeof data.reminderId === 'string' ? data.reminderId : null;
      const reminderNamespace = `${DOMAIN.app.name}-reminders`;
      const isReminder = data.namespace === reminderNamespace;
      const trigger = response.notification.request.trigger as { type?: string } | null;
      const isPush = trigger?.type === 'push';
      const route = typeof data.route === 'string' ? data.route : null;
      if (isPush) {
        analytics.trackEvent('notifications:push-clicked', {
          route,
          notificationId,
          source: 'remote',
          platform: Platform.OS,
        });
      } else if (isReminder && reminderId) {
        analytics.trackEvent('reminders:clicked', {
          reminderId,
          route,
          source: 'local',
          platform: Platform.OS,
        });
      }
      if (!route) return;
      appLogger.info('Navigating from notification', { route });
      router.push(route as Href);
    };

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (handledInitialResponseRef.current) return;
        handledInitialResponseRef.current = true;
        handleNotificationResponse(response);
      })
      .catch((error) => {
        appLogger.error('Failed to read last notification response', error);
      });

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationResponse(response);
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return undefined;
    }

    let lastResumeAt = 0;
    const runResumeCheck = () => {
      const now = Date.now();
      if (now - lastResumeAt < 500) return;
      lastResumeAt = now;
      ensureServiceWorkerRegistered().catch(() => undefined);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runResumeCheck();
      }
    };

    const handleFocus = () => {
      runResumeCheck();
    };

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      const payload = event?.data?.payload;
      if (event?.data?.type !== 'NOTIFICATION_CLICKED' || !payload) {
        return;
      }
      analytics.trackEvent('notifications:push-clicked', {
        route: payload.route ?? null,
        notificationId: payload.notificationId ?? null,
        source: payload.source ?? 'remote',
        platform: 'web',
      });
      if (typeof payload.route === 'string') {
        window.location.assign(payload.route);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, [router]);

  useEffect(() => {
    // Trigger app_ready custom event when initialization completes (Firebase only)
    if (!isAppReady || !turnOnFirebase) return;

    const triggerAppReady = async () => {
      iamLogger.info('App ready, triggering app_ready event');
      await setMessageTriggers({ app_ready: 'app_ready' });
      iamLogger.info('app_ready event triggered');
    };

    triggerAppReady().catch((error) => {
      iamLogger.error('Failed to trigger app_ready event:', error);
    });
  }, [isAppReady, turnOnFirebase]);

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

  // Listen for entry creation events and trigger push permission prompt
  useEffect(() => {
    const unsubscribe = onNotificationEvent('entry-created', (context) => {
      if (Platform.OS === 'web') return;
      if (NOTIFICATIONS.initialSoftPromptTrigger !== 'first-entry') return;
      appLogger.info('Entry created, triggering push prompt with context:', context);
      tryPromptForPush({ context }).catch((error) => {
        appLogger.error('Failed to trigger push prompt:', error);
      });
    });

    return unsubscribe;
  }, [tryPromptForPush]);

  const { status: syncStatus, queueSize } = useSync({
    push: pushOutbox,
    pull: pullUpdates,
    enabled: syncEnabled,
    autoStart: syncEnabled,
    backgroundInterval: 15 * 60,
  });

  const lastCleanupRef = useRef(0);
  const lastArchiveRef = useRef(0);
  const lastOptimizationRef = useRef(0);
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
    const requestOptimization = () => {
      const timestamp = Date.now();
      if (timestamp - lastOptimizationRef.current < DAY_MS) {
        return;
      }
      lastOptimizationRef.current = timestamp;
      optimizeDatabase({ vacuum: true })
        .then(() => {
          dbLogger.info('Ran VACUUM/PRAGMA optimize');
        })
        .catch((error) => {
          dbLogger.error('Optimization routine failed:', error);
        });
    };

    cleanupSoftDeletedRecords()
      .then((removed) => {
        if (removed > 0) {
          dbLogger.info(`Cleaned up ${removed} soft-deleted records`);
          requestOptimization();
        }
      })
      .catch((error) => {
        dbLogger.error('Soft-delete cleanup failed:', error);
      });

    if (now - lastArchiveRef.current >= 7 * DAY_MS) {
      lastArchiveRef.current = now;
      archiveOldEntries()
        .then((archived) => {
          if (archived > 0) {
            dbLogger.info(`Archived ${archived} entries older than 2 years`);
            requestOptimization();
          }
        })
        .catch((error) => {
          dbLogger.error('Archive routine failed:', error);
        });
    }
  }, [queueSize, syncStatus]);

  return (
    <I18nextProvider i18n={i18n}>
      <AnalyticsProvider>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.background }}>
          <ForegroundReminderAnalyticsHost />
          <SoftPromptModal
            open={softPrompt.open}
            title={softPrompt.title}
            message={softPrompt.message}
            allowLabel={softPrompt.allowLabel}
            notNowLabel={softPrompt.notNowLabel}
            onAllow={softPrompt.onAllow}
            onNotNow={softPrompt.onNotNow}
            onOpenChange={softPrompt.setOpen}
          />
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
    </I18nextProvider>
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
