import {
  cancelAllScheduledNotifications,
  ensureNotificationPermission,
} from '@/notifications/notifications';
import {
  type NotificationPreferences,
  loadNotificationPreferences,
  persistNotificationPreferences,
} from '@/notifications/preferences';
import {
  ensureNotificationsEnabled,
  revokeNotifications,
} from '@/notifications/notificationSystem';
import { useAnalytics } from '@/observability/AnalyticsProvider';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
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
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionState>(() =>
    Platform.OS === 'web' ? getInitialWebPermissionStatus() : 'prompt',
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

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

  // Keep preferences in sync when OS/browser permission changes (e.g., user toggles in Settings)
  useEffect(() => {
    if (permissionStatus === 'granted') {
      // Respect a manual off toggle: do not auto-enable/register if the user turned notifications off in-app.
      if (preferences.pushManuallyDisabled) {
        return;
      }

      ensureNotificationsEnabled({
        context: 'permission-sync',
        skipSoftPrompt: true,
        forceRegister: true,
      })
        .then(() => {
          setPreferences(loadNotificationPreferences());
        })
        .catch((error) => {
          analytics.trackError(error as Error, { source: 'notifications:permission-sync' });
        });
      return;
    }

    if (permissionStatus === 'blocked' || permissionStatus === 'denied') {
      // OS explicitly denied/blocked: mark as denied and turn off local reminders
      updatePreferences((prev) => ({
        ...prev,
        notificationStatus: 'denied',
        remindersEnabled: false,
      }));
      return;
    }

    if (permissionStatus === 'prompt') {
      // Permission reset to default: return to unknown, reset counters, and disable reminder-side toggles
      updatePreferences((prev) => ({
        ...prev,
        notificationStatus: 'unknown',
        remindersEnabled: false,
        osPromptAttempts: 0,
        osLastPromptAt: 0,
        softDeclineCount: 0,
        softLastDeclinedAt: 0,
      }));
    }
  }, [analytics, permissionStatus, preferences.pushManuallyDisabled, updatePreferences]);

  // If the OS/browser already granted permission (e.g., user toggled system settings),
  // but our stored status is not yet marked granted, register push again to obtain a token.
  useEffect(() => {
    if (permissionStatus !== 'granted') return;
    if (preferences.notificationStatus === 'granted') return;
    if (preferences.pushManuallyDisabled) return;

    ensureNotificationsEnabled({
      context: 'permission-sync',
      skipSoftPrompt: true,
      forceRegister: true,
    })
      .then(() => {
        setPreferences(loadNotificationPreferences());
      })
      .catch((error) => {
        analytics.trackError(error as Error, { source: 'notifications:permission-sync' });
      });
  }, [
    permissionStatus,
    preferences.notificationStatus,
    preferences.pushManuallyDisabled,
    analytics,
  ]);

  useEffect(() => {
    if (Platform.OS === 'web') {
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

  const tryPromptForPush = useCallback(
    async (context?: string) => {
      // Always refresh permissions first so we don't act on stale OS state (e.g., user
      // re-enabled notifications in Settings).
      const latestPermission = await refreshPermissionStatus();

      analytics.trackEvent('notifications:prompt-triggered', {
        context: context || 'manual',
        attempts: preferences.osPromptAttempts,
        lastPromptAt: preferences.osLastPromptAt,
      });

      // If the OS still reports blocked/denied/unavailable, surface that immediately.
      if (latestPermission === 'blocked' || latestPermission === 'denied') {
        return { status: 'denied' as const };
      }
      if (latestPermission === 'unavailable') {
        return { status: 'unavailable' as const };
      }

      const result = await ensureNotificationsEnabled({ context, skipSoftPrompt: true });

      // Reload persisted preferences after the unified API updates them
      setPreferences(loadNotificationPreferences());

      if (result.status === 'enabled') {
        // Clear manual-off flag now that the user has re-enabled notifications.
        updatePreferences((prev) => ({
          ...prev,
          pushManuallyDisabled: false,
        }));
        return { status: 'triggered' as const, registered: true };
      }
      if (result.status === 'cooldown') {
        const remainingDays = result.remainingDays ?? Math.ceil(NOTIFICATIONS.osPromptCooldownMs);
        return { status: 'cooldown' as const, remainingDays };
      }
      if (result.status === 'exhausted') {
        return { status: 'exhausted' as const };
      }
      if (result.status === 'denied') {
        return { status: 'denied' as const };
      }
      if (result.status === 'unavailable') {
        return { status: 'unavailable' as const };
      }
      if (result.status === 'error') {
        return { status: 'error' as const, message: result.message };
      }

      // If notifications already enabled, or other statuses, surface appropriate responses
      if (preferences.notificationStatus === 'granted') {
        return { status: 'already-enabled' as const };
      }

      return { status: 'error' as const, message: 'Unexpected result status' };
    },
    [
      analytics,
      preferences.notificationStatus,
      preferences.osLastPromptAt,
      preferences.osPromptAttempts,
      refreshPermissionStatus,
      updatePreferences,
    ],
  );

  const disablePushNotifications = useCallback(async () => {
    setPushError(null);
    await revokeNotifications();
    updatePreferences((prev) => ({
      ...prev,
      notificationStatus: 'unknown',
      pushManuallyDisabled: true,
      osPromptAttempts: 0,
      osLastPromptAt: 0,
    }));
    analytics.trackEvent('notifications:push-disabled', { status: 'revoked' });
  }, [analytics, updatePreferences]);

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
    isSupported: true,
    isChecking,
    error,
    pushError,
    toggleReminders: handleRemindersToggle,
    updateQuietHours: handleQuietHoursChange,
    refreshPermissionStatus,
    tryPromptForPush,
    disablePushNotifications,
  };
}
