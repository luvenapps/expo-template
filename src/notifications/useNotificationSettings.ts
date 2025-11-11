import { useAnalytics } from '@/observability/AnalyticsProvider';
import {
  NotificationPreferences,
  loadNotificationPreferences,
  persistNotificationPreferences,
} from '@/notifications/preferences';
import {
  cancelAllScheduledNotifications,
  ensureNotificationPermission,
} from '@/notifications/notifications';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

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
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
      setError('Unable to read notification permissions.');
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
        setStatusMessage('Reminders disabled.');
        return;
      }

      const granted = await ensureNotificationPermission();
      if (!granted) {
        await refreshPermissionStatus();
        updatePreferences((prev) => ({ ...prev, remindersEnabled: false }));
        setError('Enable notifications in system settings to turn on reminders.');
        analytics.trackEvent('notifications:reminders-blocked');
        return;
      }

      setPermissionStatus('granted');
      updatePreferences((prev) => ({ ...prev, remindersEnabled: true }));
      setStatusMessage('Reminders enabled.');
    },
    [analytics, refreshPermissionStatus, updatePreferences],
  );

  const handleDailySummaryToggle = useCallback(
    async (enabled: boolean) => {
      analytics.trackEvent('notifications:daily-summary', { enabled });
      setStatusMessage(enabled ? 'Daily summary enabled.' : 'Daily summary disabled.');
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

  return {
    ...preferences,
    permissionStatus,
    statusMessage,
    isSupported: isNative,
    isChecking,
    error,
    toggleReminders: handleRemindersToggle,
    toggleDailySummary: handleDailySummaryToggle,
    updateQuietHours: handleQuietHoursChange,
    refreshPermissionStatus,
  };
}
