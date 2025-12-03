import {
  cancelAllScheduledNotifications,
  ensureNotificationPermission,
} from '@/notifications/notifications';
import {
  NotificationPreferences,
  loadNotificationPreferences,
  persistNotificationPreferences,
} from '@/notifications/preferences';
import { registerForPushNotifications, revokePushToken } from '@/notifications/firebasePush';
import { useAnalytics } from '@/observability/AnalyticsProvider';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { NOTIFICATIONS } from '@/config/constants';

export type NotificationPermissionState =
  | 'granted'
  | 'prompt'
  | 'denied'
  | 'blocked'
  | 'unavailable';

const isNative = Platform.OS !== 'web';

function mapPermission(
  status: Notifications.NotificationPermissionsStatus,
): NotificationPermissionState {
  if (!isNative) {
    return 'unavailable';
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

export function useNotificationSettings() {
  const analytics = useAnalytics();
  const [preferences, setPreferences] = useState<NotificationPreferences>(() =>
    loadNotificationPreferences(),
  );
  const [permissionStatus, setPermissionStatus] =
    useState<NotificationPermissionState>('unavailable');
  const [nowTick, setNowTick] = useState(() => Date.now());
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
    if (!isNative) {
      setPermissionStatus('unavailable');
      return 'unavailable';
    }

    setIsChecking(true);
    try {
      const status = await Notifications.getPermissionsAsync();
      const mapped = mapPermission(status);
      setPermissionStatus(mapped);
      return mapped;
    } catch (permissionError) {
      setError(NOTIFICATIONS.copy.permissionReadError);
      analytics.trackError(permissionError as Error, { source: 'notifications:permissions' });
      setPermissionStatus('unavailable');
      return 'unavailable';
    } finally {
      setIsChecking(false);
    }
  }, [analytics]);

  useEffect(() => {
    refreshPermissionStatus().catch(() => undefined);
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
        setStatusMessage(NOTIFICATIONS.copy.remindersDisabled);
        return;
      }

      const granted = await ensureNotificationPermission();
      if (!granted) {
        await refreshPermissionStatus();
        updatePreferences((prev) => ({ ...prev, remindersEnabled: false }));
        setError(NOTIFICATIONS.copy.remindersBlocked);
        analytics.trackEvent('notifications:reminders-blocked');
        return;
      }

      setPermissionStatus('granted');
      updatePreferences((prev) => ({ ...prev, remindersEnabled: true }));
      setStatusMessage(NOTIFICATIONS.copy.remindersEnabled);
    },
    [analytics, refreshPermissionStatus, updatePreferences],
  );

  const handleDailySummaryToggle = useCallback(
    async (enabled: boolean) => {
      analytics.trackEvent('notifications:daily-summary', { enabled });
      setStatusMessage(
        enabled ? NOTIFICATIONS.copy.dailySummaryEnabled : NOTIFICATIONS.copy.dailySummaryDisabled,
      );
      updatePreferences((prev) => ({ ...prev, dailySummaryEnabled: enabled }));
      if (enabled && permissionStatus !== 'granted') {
        await refreshPermissionStatus();
      }
    },
    [analytics, permissionStatus, refreshPermissionStatus, updatePreferences],
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

  const promptForPushPermissions = useCallback(async () => {
    if (!canPromptForPush()) {
      return { status: 'cooldown' as const };
    }

    const now = Date.now();
    updatePreferences((prev) => ({
      ...prev,
      pushPromptAttempts: (prev.pushPromptAttempts ?? 0) + 1,
      pushLastPromptAt: now,
    }));

    setPushError(null);
    const result = await registerForPushNotifications();

    if (result.status === 'registered') {
      updatePreferences((prev) => ({ ...prev, pushOptInStatus: 'enabled' }));
      analytics.trackEvent('notifications:push-enabled');
      return { status: 'registered', token: result.token };
    }

    if (result.status === 'denied') {
      updatePreferences((prev) => ({ ...prev, pushOptInStatus: 'denied' }));
      setPushError('Enable notifications in system settings to turn on push notifications.');
      analytics.trackEvent('notifications:push-denied');
      return { status: 'denied' as const };
    }

    if (result.status === 'unavailable') {
      updatePreferences((prev) => ({ ...prev, pushOptInStatus: 'unavailable' }));
      analytics.trackEvent('notifications:push-unavailable');
      return { status: 'unavailable' as const };
    }

    // Roll back attempt increment on error
    updatePreferences((prev) => ({
      ...prev,
      pushPromptAttempts: Math.max(0, (prev.pushPromptAttempts ?? 1) - 1),
    }));
    setPushError('Unable to enable notifications right now.');
    analytics.trackEvent('notifications:push-error', { message: result.message });
    return { status: 'error' as const, message: result.message };
  }, [analytics, canPromptForPush, updatePreferences]);

  const disablePushNotifications = useCallback(async () => {
    setPushError(null);
    const result = await revokePushToken();

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
    setPushError('Unable to disable push notifications right now.');
  }, [analytics, updatePreferences]);

  return {
    ...preferences,
    permissionStatus,
    statusMessage,
    isSupported: isNative,
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
  };
}
