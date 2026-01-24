import { getLocalName, setLocalName } from '@/auth/nameStorage';
import { getPendingRemoteReset, runPendingRemoteReset } from '@/auth/reset';
import { initSessionListener, useSessionStore } from '@/auth/session';
import { NOTIFICATIONS } from '@/config/constants';
import { DOMAIN } from '@/config/domain.config';
import { archiveOldEntries } from '@/db/sqlite/archive';
import { cleanupSoftDeletedRecords } from '@/db/sqlite/cleanup';
import { optimizeDatabase } from '@/db/sqlite/maintenance';
import i18n from '@/i18n';
import {
  configureNotificationHandler,
  initializeFCMListeners,
  initializeInAppMessaging,
  registerNotificationCategories,
  resetBadgeCount,
  setMessageTriggers,
} from '@/notifications';
import { ensureServiceWorkerRegistered } from '@/notifications/firebasePush';
import { ForegroundReminderAnalyticsHost } from '@/notifications/ForegroundReminderAnalyticsHost';
import { onNotificationEvent } from '@/notifications/notificationEvents';
import { refreshReminderSeriesWindows } from '@/notifications/scheduler';
import { useNotificationSettings } from '@/notifications/useNotificationSettings';
import { getFeatureFlagClient } from '@/featureFlags';
import { analytics } from '@/observability/analytics';
import { AnalyticsProvider } from '@/observability/AnalyticsProvider';
import { createLogger } from '@/observability/logger';
import { getQueryClient, getQueryClientPersistOptions } from '@/state';
import { pullUpdates, pushOutbox, useSync } from '@/sync';
import { NamePromptModal } from '@/ui/components/NamePromptModal';
import { SoftPromptModal } from '@/ui/components/SoftPromptModal';
import { useThemeContext } from '@/ui/theme/ThemeProvider';
import { QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import * as Notifications from 'expo-notifications';
import { useRouter, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PropsWithChildren, useEffect, useMemo, useRef, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { AppState, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';

const queryClient = getQueryClient();
const persistOptions = getQueryClientPersistOptions();
const isWeb = Platform.OS === 'web';
const iamLogger = createLogger('IAM');
const appLogger = createLogger('AppProviders');
const dbLogger = createLogger('SQLite');
const resetLogger = createLogger('Reset');

export function AppProviders({ children }: PropsWithChildren) {
  const router = useRouter();
  const sessionStatus = useSessionStore((state) => state.status);
  const session = useSessionStore((state) => state.session);
  const isAuthenticated = sessionStatus === 'authenticated';
  const syncEnabled = Platform.OS !== 'web' && isAuthenticated;
  const { resolvedTheme, palette } = useThemeContext();
  const [isAppReady, setIsAppReady] = useState(false);
  const [namePromptOpen, setNamePromptOpen] = useState(false);
  const [namePromptValue, setNamePromptValue] = useState('');
  const { tryPromptForPush, softPrompt } = useNotificationSettings();
  const turnOnFirebase = useMemo(
    () =>
      process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === 'true' ||
      process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === '1',
    [],
  );

  useEffect(() => {
    const initialize = async () => {
      initSessionListener((session) => {
        const metadata = session?.user?.user_metadata ?? {};
        const metadataName =
          typeof metadata.full_name === 'string'
            ? metadata.full_name
            : typeof metadata.name === 'string'
              ? metadata.name
              : typeof metadata.fullName === 'string'
                ? metadata.fullName
                : '';
        if (metadataName.trim()) {
          setLocalName(metadataName);
          setNamePromptValue(metadataName);
          setNamePromptOpen(false);
        }
        if (getPendingRemoteReset()) {
          resetLogger.info('Pending remote reset detected');
        }
        runPendingRemoteReset(session, resetLogger).catch(() => undefined);
      });

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
    const client = getFeatureFlagClient();
    if (!session?.user) {
      client.setContext({ isAnonymous: true }).catch(() => undefined);
      return;
    }

    const metadata = session.user.user_metadata ?? {};
    const name =
      typeof metadata.full_name === 'string'
        ? metadata.full_name
        : typeof metadata.name === 'string'
          ? metadata.name
          : typeof metadata.fullName === 'string'
            ? metadata.fullName
            : undefined;

    client
      .setContext({
        id: session.user.id,
        email: session.user.email ?? undefined,
        name,
      })
      .catch(() => undefined);
  }, [session?.user]);

  useEffect(() => {
    if (isWeb) {
      return;
    }

    const existingName = getLocalName();
    if (existingName?.trim()) {
      setNamePromptValue(existingName);
      setNamePromptOpen(false);
      return;
    }

    setNamePromptOpen(true);
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return undefined;
    }

    const handledInitialResponseRef = { current: false };

    const handleNotificationResponse = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const data = response.notification.request.content.data ?? {};
      const reminderId = typeof data.reminderId === 'string' ? data.reminderId : null;
      const reminderNamespace = `${DOMAIN.app.name}-reminders`;
      const isReminder = data.namespace === reminderNamespace;
      const route = typeof data.route === 'string' ? data.route : null;
      if (isReminder && reminderId) {
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
    if (Platform.OS === 'web') {
      return undefined;
    }

    const refreshSeries = () => {
      refreshReminderSeriesWindows().catch((error) => {
        appLogger.error('Failed to refresh reminder series window', error);
      });
    };

    refreshSeries();
    const subscription = AppState.addEventListener?.('change', (state) => {
      if (state === 'active') {
        refreshSeries();
      }
    });

    return () => {
      subscription?.remove?.();
    };
  }, []);

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
          {isWeb ? null : (
            <NamePromptModal
              open={namePromptOpen}
              title={i18n.t('settings.namePromptTitle')}
              message={i18n.t('settings.namePromptDescription')}
              label={i18n.t('settings.profileNameLabel')}
              placeholder={i18n.t('settings.namePromptPlaceholder')}
              value={namePromptValue}
              actionLabel={i18n.t('settings.namePromptAction')}
              onChangeText={setNamePromptValue}
              onSave={(nextName) => {
                setLocalName(nextName);
                setNamePromptValue(nextName);
                setNamePromptOpen(false);
              }}
              onOpenChange={setNamePromptOpen}
            />
          )}
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
