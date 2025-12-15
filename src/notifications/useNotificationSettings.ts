import {
  cancelAllScheduledNotifications,
  ensureNotificationPermission,
} from '@/notifications/notifications';
import {
  NotificationPreferences,
  loadNotificationPreferences,
  persistNotificationPreferences,
} from '@/notifications/preferences';
import {
  registerForPushNotifications,
  revokePushToken,
  setupWebForegroundMessageListener,
  ensureServiceWorkerRegistered,
} from '@/notifications/firebasePush';
import { useAnalytics } from '@/observability/AnalyticsProvider';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { NOTIFICATIONS } from '@/config/constants';
import { useTranslation } from 'react-i18next';

export type NotificationPermissionState =
  | 'granted'
  | 'prompt'
  | 'denied'
  | 'blocked'
  | 'unavailable';

const isNative = Platform.OS !== 'web';
const isWebSupported = Platform.OS === 'web';

function mapPermission(
  status: Notifications.NotificationPermissionsStatus,
  platform: typeof Platform.OS,
): NotificationPermissionState {
  if (platform === 'web') {
    const permission = typeof Notification !== 'undefined' ? Notification.permission : 'default';
    if (permission === 'granted') return 'granted';
    if (permission === 'denied') return 'blocked';
    return 'prompt';
  }

  if (status.granted || status.status === Notifications.PermissionStatus.GRANTED) {
    return 'granted';
  }

  if (status.status === Notifications.PermissionStatus.DENIED && !status.canAskAgain) {
    return 'blocked';
  }

  if (status.status === Notifications.PermissionStatus.DENIED) {
    return 'denied';
  }

  return 'prompt';
}

function getInitialWebPermissionStatus(): NotificationPermissionState {
  if (Platform.OS !== 'web') return 'unavailable';

  try {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      return 'prompt';
    }

    const permission = Notification.permission;
    if (permission === 'granted') return 'granted';
    if (permission === 'denied') return 'blocked';
    return 'prompt';
  } catch {
    return 'prompt';
  }
}

export function useNotificationSettings() {
  const analytics = useAnalytics();
  const { t } = useTranslation();
  const [preferences, setPreferences] = useState<NotificationPreferences>(() =>
    loadNotificationPreferences(),
  );
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionState>(
    getInitialWebPermissionStatus,
  );
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const hasRegisteredPushRef = useRef(false);
  const isRegisteringPushRef = useRef(false);
  const prevPermissionRef = useRef<NotificationPermissionState>('prompt');

  const updatePreferences = useCallback(
    (
      next: NotificationPreferences | ((prev: NotificationPreferences) => NotificationPreferences),
    ) => {
      setPreferences((prev) => {
        const value =
          typeof next === 'function'
            ? (next as (prev: NotificationPreferences) => NotificationPreferences)(prev)
            : next;
        persistNotificationPreferences(value);
        return value;
      });
    },
    [],
  );

  const refreshPermissionStatus = useCallback(async () => {
    setIsChecking(true);
    try {
      // On web, use Notification.permission directly to avoid Expo API issues
      if (Platform.OS === 'web') {
        const permission =
          typeof Notification !== 'undefined' ? Notification.permission : 'default';
        let mapped: NotificationPermissionState = 'prompt';
        if (permission === 'granted') mapped = 'granted';
        else if (permission === 'denied') mapped = 'blocked';
        else mapped = 'prompt';
        setPermissionStatus(mapped);
        return mapped;
      }

      const status = await Notifications.getPermissionsAsync();
      const mapped = mapPermission(status, Platform.OS);
      setPermissionStatus(mapped);
      return mapped;
    } catch (permissionError) {
      setError(t(NOTIFICATIONS.copyKeys.permissionReadError));
      analytics.trackError(permissionError as Error, { source: 'notifications:permissions' });
      // On web, default to 'prompt' to allow users to try enabling notifications
      const fallbackStatus = Platform.OS === 'web' ? 'prompt' : 'unavailable';
      setPermissionStatus(fallbackStatus);
      return fallbackStatus;
    } finally {
      setIsChecking(false);
    }
  }, [analytics, t]);

  useEffect(() => {
    refreshPermissionStatus().catch(() => undefined);
  }, [refreshPermissionStatus]);

  // If OS/browser permission transitions to granted (including manual enable in settings),
  // ensure we register once and mark push enabled.
  useEffect(() => {
    const wasGranted = prevPermissionRef.current === 'granted';
    if (
      permissionStatus === 'granted' &&
      !wasGranted &&
      preferences.pushOptInStatus === 'enabled'
    ) {
      if (isRegisteringPushRef.current || hasRegisteredPushRef.current) {
        prevPermissionRef.current = permissionStatus;
        return;
      }
      isRegisteringPushRef.current = true;
      registerForPushNotifications()
        .then((result) => {
          if (result.status === 'registered') {
            hasRegisteredPushRef.current = true;
            updatePreferences((prev) => ({
              ...prev,
              pushOptInStatus: 'enabled',
            }));
            analytics.trackEvent('notifications:push-enabled', { source: 'permission-sync' });
          } else if (result.status === 'denied') {
            updatePreferences((prev) => ({ ...prev, pushOptInStatus: 'denied' }));
          }
        })
        .catch((err) => {
          console.error('[Notifications] Failed to auto-register after permission granted:', err);
        })
        .finally(() => {
          isRegisteringPushRef.current = false;
        });
    }
    if (permissionStatus === 'blocked' || permissionStatus === 'denied') {
      hasRegisteredPushRef.current = false;
      revokePushToken().catch((err) =>
        console.debug('[Notifications] Failed to revoke push after denial:', err),
      );
      updatePreferences((prev) => ({
        ...prev,
        pushOptInStatus: 'denied',
      }));
    }
    // If permission was reset to prompt/default, clear local push state so the toggle reflects reality.
    if (
      permissionStatus === 'prompt' &&
      preferences.pushOptInStatus !== 'unknown' &&
      !hasRegisteredPushRef.current
    ) {
      hasRegisteredPushRef.current = false;
      revokePushToken().catch((err) =>
        console.debug('[Notifications] Failed to revoke push after reset:', err),
      );
      updatePreferences((prev) => ({
        ...prev,
        pushOptInStatus: 'unknown',
        pushPromptAttempts: 0,
        pushLastPromptAt: 0,
      }));
      setPushError(null);
    }
    prevPermissionRef.current = permissionStatus;
  }, [analytics, permissionStatus, preferences.pushOptInStatus, updatePreferences]);

  // Repair path: if permission is granted, push is marked enabled, but we haven't registered yet, register now.
  useEffect(() => {
    if (permissionStatus !== 'granted') return;
    if (preferences.pushOptInStatus !== 'enabled') return;
    if (hasRegisteredPushRef.current || isRegisteringPushRef.current) return;

    isRegisteringPushRef.current = true;
    registerForPushNotifications()
      .then((result) => {
        if (result.status === 'registered') {
          hasRegisteredPushRef.current = true;
          updatePreferences((prev) => ({ ...prev, pushOptInStatus: 'enabled' }));
          analytics.trackEvent('notifications:push-enabled', { source: 'permission-sync' });
        } else if (result.status === 'denied') {
          updatePreferences((prev) => ({ ...prev, pushOptInStatus: 'denied' }));
        }
      })
      .catch((err) => {
        console.error('[Notifications] Failed to repair push registration:', err);
      })
      .finally(() => {
        isRegisteringPushRef.current = false;
      });
  }, [analytics, permissionStatus, preferences.pushOptInStatus, updatePreferences]);

  // Set up web foreground message listener on mount
  // Also ensure service worker is registered if push is enabled
  useEffect(() => {
    if (Platform.OS === 'web') {
      setupWebForegroundMessageListener();

      // Check if push is enabled and restore service worker if needed
      if (preferences.pushOptInStatus === 'enabled') {
        ensureServiceWorkerRegistered()
          .then((result) => {
            if (result?.status === 'registered') {
              hasRegisteredPushRef.current = true;
              updatePreferences((prev) => ({ ...prev, pushOptInStatus: 'enabled' }));
              console.warn(
                '[FCM:web] ⚠️  Service worker was missing and has been restored with a NEW token:',
                result.token,
              );
              console.warn(
                '[FCM:web] ⚠️  You may need to update this token in your backend to continue receiving notifications',
              );
            }
          })
          .catch((error) => {
            console.debug('[FCM:web] Failed to ensure service worker registered:', error);
          });
      }
    }
  }, [preferences.pushOptInStatus, updatePreferences]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      // On web, listen for visibility changes to refresh permission status
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          refreshPermissionStatus().catch(() => undefined);
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshPermissionStatus().catch(() => undefined);
      }
    });
    return () => {
      subscription?.remove?.();
    };
  }, [refreshPermissionStatus]);

  const handleRemindersToggle = useCallback(
    async (enabled: boolean) => {
      analytics.trackEvent('notifications:reminders', { enabled });
      setStatusMessage(null);
      setError(null);

      if (!enabled) {
        updatePreferences((prev) => ({ ...prev, remindersEnabled: false }));
        if (isNative) {
          await cancelAllScheduledNotifications();
        }
        setStatusMessage(t(NOTIFICATIONS.copyKeys.remindersDisabled));
        return;
      }

      const granted = await ensureNotificationPermission();
      if (!granted) {
        await refreshPermissionStatus();
        updatePreferences((prev) => ({ ...prev, remindersEnabled: false }));
        setError(null);
        setStatusMessage(null);
        analytics.trackEvent('notifications:reminders-blocked');
        return;
      }

      setPermissionStatus('granted');
      updatePreferences((prev) => ({ ...prev, remindersEnabled: true }));
      setStatusMessage(t(NOTIFICATIONS.copyKeys.remindersEnabled));
    },
    [analytics, refreshPermissionStatus, t, updatePreferences],
  );

  const handleDailySummaryToggle = useCallback(
    async (enabled: boolean) => {
      analytics.trackEvent('notifications:daily-summary', { enabled });
      setStatusMessage(
        enabled
          ? t(NOTIFICATIONS.copyKeys.dailySummaryEnabled)
          : t(NOTIFICATIONS.copyKeys.dailySummaryDisabled),
      );
      updatePreferences((prev) => ({ ...prev, dailySummaryEnabled: enabled }));
      if (enabled && permissionStatus !== 'granted') {
        await refreshPermissionStatus();
      }
    },
    [analytics, permissionStatus, refreshPermissionStatus, t, updatePreferences],
  );

  const handleQuietHoursChange = useCallback(
    (next: number[]) => {
      if (next.length < 2) return;
      const normalized: [number, number] = [
        Math.max(0, Math.min(24, Math.floor(next[0]))),
        Math.max(0, Math.min(24, Math.floor(next[1]))),
      ];
      analytics.trackEvent('notifications:quiet-hours', {
        start: normalized[0],
        end: normalized[1],
      });
      updatePreferences((prev) => ({ ...prev, quietHours: normalized }));
    },
    [analytics, updatePreferences],
  );

  const canPromptForPush = useCallback(() => {
    const now = nowTick;
    const attempts = preferences.pushPromptAttempts ?? 0;
    const lastPromptAt = preferences.pushLastPromptAt ?? 0;
    if (attempts >= NOTIFICATIONS.pushPromptMaxAttempts) return false;
    if (lastPromptAt === 0) return true;
    return now - lastPromptAt >= NOTIFICATIONS.pushPromptCooldownMs;
  }, [nowTick, preferences.pushPromptAttempts, preferences.pushLastPromptAt]);

  useEffect(() => {
    const attempts = preferences.pushPromptAttempts ?? 0;
    const lastPromptAt = preferences.pushLastPromptAt ?? 0;
    if (attempts >= NOTIFICATIONS.pushPromptMaxAttempts) return;
    if (lastPromptAt === 0) return;
    const nextPromptAt = lastPromptAt + NOTIFICATIONS.pushPromptCooldownMs;
    const delay = nextPromptAt - Date.now();
    if (delay <= 0) {
      setNowTick(Date.now());
      return;
    }
    const timer = setTimeout(() => setNowTick(Date.now()), delay + 10);
    return () => clearTimeout(timer);
  }, [preferences.pushPromptAttempts, preferences.pushLastPromptAt]);

  const promptForPushPermissions = useCallback(
    async (options?: { ignoreCooldown?: boolean }) => {
      const ignoreCooldown = options?.ignoreCooldown ?? false;
      console.log(
        '[promptForPushPermissions] Starting, canPromptForPush:',
        canPromptForPush(),
        'ignoreCooldown:',
        ignoreCooldown,
      );

      if (!ignoreCooldown && !canPromptForPush()) {
        console.log('[promptForPushPermissions] Cooldown active, returning');
        return { status: 'cooldown' as const };
      }

      console.log('[promptForPushPermissions] Calling registerForPushNotifications...');
      setPushError(null);
      const result = await registerForPushNotifications();
      console.log('[promptForPushPermissions] registerForPushNotifications result:', result);

      // Don't count as an attempt if push is unavailable (not configured)
      if (result.status === 'unavailable') {
        console.log('[promptForPushPermissions] Status unavailable, updating preferences');
        updatePreferences((prev) => ({ ...prev, pushOptInStatus: 'unavailable' }));
        analytics.trackEvent('notifications:push-unavailable');
        return { status: 'unavailable' as const };
      }

      // Infrastructure errors (service worker, network) shouldn't count as user attempts
      if (result.status === 'error') {
        console.log('[promptForPushPermissions] Error (no attempt counted):', result.message);
        setPushError(t('notifications.pushErrorDescription'));
        analytics.trackEvent('notifications:push-error', { message: result.message });
        return { status: 'error' as const, message: result.message };
      }

      // Only increment attempt counter for actual user decisions (registered/denied)
      const now = Date.now();
      updatePreferences((prev) => ({
        ...prev,
        pushPromptAttempts: (prev.pushPromptAttempts ?? 0) + 1,
        pushLastPromptAt: now,
      }));

      if (result.status === 'registered') {
        updatePreferences((prev) => ({
          ...prev,
          pushOptInStatus: 'enabled',
        }));
        setPermissionStatus('granted');
        hasRegisteredPushRef.current = true;
        analytics.trackEvent('notifications:push-enabled');
        return { status: 'registered', token: result.token };
      }

      if (result.status === 'denied') {
        updatePreferences((prev) => ({ ...prev, pushOptInStatus: 'denied' }));
        setPushError(t('notifications.pushDeniedDescription'));
        analytics.trackEvent('notifications:push-denied');
        return { status: 'denied' as const };
      }

      // Shouldn't reach here, but handle gracefully
      return result;
    },
    [analytics, canPromptForPush, t, updatePreferences],
  );

  const disablePushNotifications = useCallback(async () => {
    setPushError(null);
    const result = await revokePushToken();
    hasRegisteredPushRef.current = false;

    updatePreferences((prev) => ({
      ...prev,
      pushOptInStatus: 'unknown',
      pushPromptAttempts: 0,
      pushLastPromptAt: 0,
    }));

    if (result.status === 'revoked' || result.status === 'unavailable') {
      analytics.trackEvent('notifications:push-disabled', { status: result.status });
      return;
    }

    analytics.trackEvent('notifications:push-error', { message: result.message });
    setPushError(t('notifications.pushErrorDescription'));
  }, [analytics, t, updatePreferences]);

  /**
   * Try to prompt for push permissions with context tracking.
   * Checks cooldown/attempt counters before calling promptForPushPermissions().
   *
   * @param context - Context string for analytics (e.g., 'entry-created', 'manual')
   * @returns Status indicating the result: 'triggered', 'cooldown', 'exhausted', 'unavailable', 'denied', 'error'
   */
  const tryPromptForPush = useCallback(
    async (context?: string) => {
      const attempts = preferences.pushPromptAttempts ?? 0;
      const lastPromptAt = preferences.pushLastPromptAt ?? 0;
      const now = Date.now();

      // Track the prompt attempt with context
      analytics.trackEvent('notifications:prompt-triggered', {
        context: context || 'manual',
        attempts,
        lastPromptAt,
      });

      // Check if user has exhausted all attempts
      if (attempts >= NOTIFICATIONS.pushPromptMaxAttempts) {
        console.log('[tryPromptForPush] Attempts exhausted:', attempts);
        return { status: 'exhausted' as const };
      }

      // Check if still in cooldown period
      if (lastPromptAt > 0 && now - lastPromptAt < NOTIFICATIONS.pushPromptCooldownMs) {
        const remainingMs = NOTIFICATIONS.pushPromptCooldownMs - (now - lastPromptAt);
        const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
        console.log('[tryPromptForPush] Cooldown active, remaining days:', remainingDays);
        return { status: 'cooldown' as const, remainingDays };
      }

      // Check if user already has push enabled
      if (preferences.pushOptInStatus === 'enabled') {
        console.log('[tryPromptForPush] Push already enabled');
        return { status: 'already-enabled' as const };
      }

      // If OS permission is blocked/denied, surface that instead of claiming enabled
      if (permissionStatus === 'blocked' || permissionStatus === 'denied') {
        console.log('[tryPromptForPush] OS permission not granted:', permissionStatus);
        return { status: 'denied' as const };
      }

      // Check if user permanently denied push
      if (preferences.pushOptInStatus === 'denied') {
        console.log('[tryPromptForPush] Push previously denied');
        return { status: 'denied' as const };
      }

      // All checks passed, trigger the prompt
      console.log('[tryPromptForPush] Triggering push prompt, context:', context);
      const result = await promptForPushPermissions();

      // Map promptForPushPermissions result to tryPromptForPush status
      if (result.status === 'registered') {
        return { status: 'triggered' as const, registered: true };
      }
      if (result.status === 'unavailable') {
        return { status: 'unavailable' as const };
      }
      if (result.status === 'denied') {
        return { status: 'denied' as const };
      }
      if (result.status === 'error') {
        return { status: 'error' as const, message: result.message };
      }
      if (result.status === 'cooldown') {
        // This shouldn't happen since we checked cooldown above, but handle gracefully
        return { status: 'cooldown' as const };
      }

      // Fallback for unexpected status
      return { status: 'error' as const, message: 'Unexpected result status' };
    },
    [analytics, permissionStatus, preferences, promptForPushPermissions],
  );

  useEffect(() => {
    if (
      permissionStatus === 'blocked' ||
      permissionStatus === 'denied' ||
      permissionStatus === 'unavailable'
    ) {
      setPushError(null);
    }
  }, [permissionStatus]);

  return {
    ...preferences,
    permissionStatus,
    statusMessage,
    isSupported: isNative || isWebSupported,
    isChecking,
    error,
    pushError,
    toggleReminders: handleRemindersToggle,
    toggleDailySummary: handleDailySummaryToggle,
    updateQuietHours: handleQuietHoursChange,
    refreshPermissionStatus,
    canPromptForPush: canPromptForPush(),
    promptForPushPermissions,
    disablePushNotifications,
    tryPromptForPush,
  };
}
