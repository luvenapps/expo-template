import { NOTIFICATIONS } from '@/config/constants';
import {
  ensureNotificationsEnabled,
  revokeNotifications,
} from '@/notifications/notificationSystem';
import {
  type NotificationPreferences,
  loadNotificationPreferences,
  persistNotificationPreferences,
} from '@/notifications/preferences';
import {
  NOTIFICATION_PERMISSION_STATE,
  NOTIFICATION_STATUS,
  WEB_NOTIFICATION_PERMISSION,
  type NotificationPermissionState,
} from '@/notifications/status';
import { useAnalytics } from '@/observability/AnalyticsProvider';
import { createLogger } from '@/observability/logger';
import { onNotificationEvent } from '@/observability/notificationEvents';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Platform } from 'react-native';

const logger = createLogger('PermSync');

function mapPermission(
  status: Notifications.NotificationPermissionsStatus,
  platform: typeof Platform.OS,
): NotificationPermissionState {
  if (platform === 'web') {
    const permission =
      typeof Notification !== 'undefined'
        ? Notification.permission
        : WEB_NOTIFICATION_PERMISSION.DEFAULT;
    if (permission === WEB_NOTIFICATION_PERMISSION.GRANTED) {
      return NOTIFICATION_PERMISSION_STATE.GRANTED;
    }
    if (permission === WEB_NOTIFICATION_PERMISSION.DENIED) {
      return NOTIFICATION_PERMISSION_STATE.BLOCKED;
    }
    return NOTIFICATION_PERMISSION_STATE.PROMPT;
  }

  if (status.granted || status.status === Notifications.PermissionStatus.GRANTED) {
    return NOTIFICATION_PERMISSION_STATE.GRANTED;
  }

  if (status.status === Notifications.PermissionStatus.DENIED && !status.canAskAgain) {
    return NOTIFICATION_PERMISSION_STATE.BLOCKED;
  }

  if (status.status === Notifications.PermissionStatus.DENIED && status.canAskAgain) {
    return NOTIFICATION_PERMISSION_STATE.PROMPT;
  }

  if (status.status === Notifications.PermissionStatus.DENIED) {
    return NOTIFICATION_PERMISSION_STATE.DENIED;
  }

  return NOTIFICATION_PERMISSION_STATE.PROMPT;
}

function getInitialWebPermissionStatus(): NotificationPermissionState {
  if (Platform.OS !== 'web') return NOTIFICATION_PERMISSION_STATE.UNAVAILABLE;

  try {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      return NOTIFICATION_PERMISSION_STATE.PROMPT;
    }

    const permission = Notification.permission;
    if (permission === WEB_NOTIFICATION_PERMISSION.GRANTED) {
      return NOTIFICATION_PERMISSION_STATE.GRANTED;
    }
    if (permission === WEB_NOTIFICATION_PERMISSION.DENIED) {
      return NOTIFICATION_PERMISSION_STATE.BLOCKED;
    }
    return NOTIFICATION_PERMISSION_STATE.PROMPT;
  } catch {
    return NOTIFICATION_PERMISSION_STATE.PROMPT;
  }
}

export function useNotificationSettings() {
  const analytics = useAnalytics();
  const { t } = useTranslation();
  const [preferences, setPreferences] = useState<NotificationPreferences>(() =>
    loadNotificationPreferences(),
  );
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionState>(() =>
    Platform.OS === 'web' ? getInitialWebPermissionStatus() : NOTIFICATION_PERMISSION_STATE.PROMPT,
  );
  const [error, setError] = useState<string | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [softPromptOpen, setSoftPromptOpen] = useState(false);
  const [softPromptContext, setSoftPromptContext] = useState<string | undefined>(undefined);
  const lastAutoSoftPromptRef = useRef<number | null>(null);

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
        let mapped: NotificationPermissionState = NOTIFICATION_PERMISSION_STATE.PROMPT;
        if (permission === WEB_NOTIFICATION_PERMISSION.GRANTED) {
          mapped = NOTIFICATION_PERMISSION_STATE.GRANTED;
        } else if (permission === WEB_NOTIFICATION_PERMISSION.DENIED) {
          mapped = NOTIFICATION_PERMISSION_STATE.BLOCKED;
        } else mapped = NOTIFICATION_PERMISSION_STATE.PROMPT;
        setPermissionStatus(mapped);
        return mapped;
      }

      const status = await Notifications.getPermissionsAsync();
      const mapped = mapPermission(status, Platform.OS);
      setPermissionStatus(mapped);
      return mapped;
    } catch (permissionError) {
      setError(t('notifications.permissionReadError'));
      analytics.trackError(permissionError as Error, { source: 'notifications:permissions' });
      const fallbackStatus =
        Platform.OS === 'web'
          ? NOTIFICATION_PERMISSION_STATE.PROMPT
          : NOTIFICATION_PERMISSION_STATE.UNAVAILABLE;
      setPermissionStatus(fallbackStatus);
      return fallbackStatus;
    } finally {
      setIsChecking(false);
    }
  }, [analytics, t]);

  const refreshPreferences = useCallback(() => {
    setPreferences(loadNotificationPreferences());
  }, []);

  useEffect(() => {
    refreshPermissionStatus().catch(() => undefined);
  }, [refreshPermissionStatus]);

  // Keep preferences in sync when OS/browser permission changes (e.g., user toggles in Settings)
  useEffect(() => {
    logger.debug('Effect triggered', {
      permissionStatus,
      pushManuallyDisabled: preferences.pushManuallyDisabled,
      notificationStatus: preferences.notificationStatus,
    });

    if (permissionStatus === NOTIFICATION_PERMISSION_STATE.GRANTED) {
      // Respect a manual off toggle: do not auto-enable/register if the user turned notifications off in-app.
      if (preferences.pushManuallyDisabled) {
        logger.debug('Skipping - manually disabled');
        return;
      }

      logger.debug('Calling ensureNotificationsEnabled...');
      ensureNotificationsEnabled({
        context: 'permission-sync',
        skipSoftPrompt: true,
        forceRegister: true,
      })
        .then((result) => {
          logger.debug('ensureNotificationsEnabled result:', result);
          setPreferences(loadNotificationPreferences());
        })
        .catch((error) => {
          logger.error('ensureNotificationsEnabled error:', error);
          analytics.trackError(error as Error, { source: 'notifications:permission-sync' });
        });
      return;
    }

    if (
      permissionStatus === NOTIFICATION_PERMISSION_STATE.BLOCKED ||
      permissionStatus === NOTIFICATION_PERMISSION_STATE.DENIED
    ) {
      // OS explicitly denied/blocked: mark as denied and turn off local reminders
      updatePreferences((prev) => ({
        ...prev,
        notificationStatus: NOTIFICATION_STATUS.DENIED,
      }));
      return;
    }

    if (permissionStatus === NOTIFICATION_PERMISSION_STATE.PROMPT) {
      // Permission reset to default: keep soft-decline history, only reset hard-denial state.
      updatePreferences((prev) => {
        if (prev.notificationStatus === NOTIFICATION_STATUS.SOFT_DECLINED) return prev;
        if (prev.notificationStatus === NOTIFICATION_STATUS.UNKNOWN) return prev;
        if (
          prev.notificationStatus === NOTIFICATION_STATUS.DENIED ||
          prev.notificationStatus === NOTIFICATION_STATUS.UNAVAILABLE
        ) {
          return {
            ...prev,
            notificationStatus: NOTIFICATION_STATUS.UNKNOWN,
          };
        }
        if (prev.notificationStatus === NOTIFICATION_STATUS.GRANTED) {
          return {
            ...prev,
            notificationStatus: NOTIFICATION_STATUS.UNKNOWN,
          };
        }
        return prev;
      });
    }
  }, [
    analytics,
    permissionStatus,
    preferences.pushManuallyDisabled,
    preferences.notificationStatus,
    updatePreferences,
  ]);

  // If the OS/browser already granted permission (e.g., user toggled system settings),
  // but our stored status is not yet marked granted, register push again to obtain a token.
  useEffect(() => {
    if (permissionStatus !== NOTIFICATION_PERMISSION_STATE.GRANTED) return;
    if (preferences.notificationStatus === NOTIFICATION_STATUS.GRANTED) return;
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
      return undefined;
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

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return undefined;
    }

    return onNotificationEvent((event) => {
      analytics.trackEvent(event.name, event.payload);
    });
  }, [analytics]);

  const handleSoftPromptAllow = useCallback(async () => {
    const result = await ensureNotificationsEnabled({
      context: softPromptContext || 'auto',
      skipSoftPrompt: true,
      forceRegister: true,
    });

    // Reload persisted preferences after the unified API updates them (matches tryPromptForPush)
    setPreferences(loadNotificationPreferences());
    setSoftPromptOpen(false);
    setSoftPromptContext(undefined);

    if (result.status === 'enabled') {
      // Clear manual-off flag now that the user has re-enabled notifications (matches tryPromptForPush)
      updatePreferences((prev) => ({
        ...prev,
        pushManuallyDisabled: false,
      }));
    }

    // On web, reload to ensure full state sync
    if (result.status === 'enabled' && Platform.OS === 'web') {
      window.location.reload();
    }
  }, [setPreferences, softPromptContext, updatePreferences]);

  const handleSoftPromptDecline = useCallback(() => {
    const now = Date.now();
    updatePreferences((prev) => ({
      ...prev,
      notificationStatus: NOTIFICATION_STATUS.SOFT_DECLINED,
      softDeclineCount: prev.softDeclineCount + 1,
      softLastDeclinedAt: now,
    }));
    setSoftPromptOpen(false);
    setSoftPromptContext(undefined);
  }, [updatePreferences]);

  const tryPromptForPush = useCallback(
    async (options?: { context?: string; skipSoftPrompt?: boolean }) => {
      const context = options?.context;
      const skipSoftPrompt = options?.skipSoftPrompt ?? false;
      // Always refresh permissions first so we don't act on stale OS state (e.g., user
      // re-enabled notifications in Settings).
      const latestPermission = await refreshPermissionStatus();

      analytics.trackEvent('notifications:prompt-triggered', {
        context: context || 'manual',
      });

      // If the OS still reports blocked/denied/unavailable, surface that immediately.
      if (
        latestPermission === NOTIFICATION_PERMISSION_STATE.BLOCKED ||
        latestPermission === NOTIFICATION_PERMISSION_STATE.DENIED
      ) {
        return { status: 'denied' as const };
      }
      if (latestPermission === NOTIFICATION_PERMISSION_STATE.UNAVAILABLE) {
        return { status: 'unavailable' as const };
      }

      // Soft prompt: if permission is still prompt/default, show an educational dialog
      const now = Date.now();
      const softCooldownActive =
        preferences.softLastDeclinedAt &&
        now - preferences.softLastDeclinedAt < NOTIFICATIONS.softDeclineCooldownMs;

      if (
        latestPermission === NOTIFICATION_PERMISSION_STATE.PROMPT &&
        !skipSoftPrompt &&
        !softCooldownActive
      ) {
        setSoftPromptContext(context);
        setSoftPromptOpen(true);
        return { status: 'soft-prompt' as const };
      }

      // Respect soft-decline cooldown
      if (softCooldownActive) {
        const remainingMs =
          NOTIFICATIONS.softDeclineCooldownMs - (now - (preferences.softLastDeclinedAt || 0));
        const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
        return { status: 'cooldown' as const, remainingDays };
      }

      const result = await ensureNotificationsEnabled({
        context,
        skipSoftPrompt: true,
      });

      // Reload persisted preferences after the unified API updates them
      const latestPreferences = loadNotificationPreferences();
      setPreferences(latestPreferences);

      if (result.status === 'enabled') {
        // Clear manual-off flag now that the user has re-enabled notifications.
        updatePreferences({
          ...latestPreferences,
          pushManuallyDisabled: false,
        });
        return { status: 'triggered' as const, registered: true };
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
      if (preferences.notificationStatus === NOTIFICATION_STATUS.GRANTED) {
        return { status: 'already-enabled' as const };
      }

      return { status: 'error' as const, message: 'Unexpected result status' };
    },
    [
      analytics,
      preferences.notificationStatus,
      preferences.softLastDeclinedAt,
      refreshPermissionStatus,
      updatePreferences,
    ],
  );

  // Auto-show the soft prompt on first load (or after cooldown) when OS/browser is still in
  // prompt/default state. Relies on tryPromptForPush to enforce cooldown/attempts.
  useEffect(() => {
    const shouldAutoPrompt =
      NOTIFICATIONS.initialSoftPromptTrigger === 'app-install' ||
      (Platform.OS === 'web' && NOTIFICATIONS.initialSoftPromptTrigger === 'first-entry');
    if (!shouldAutoPrompt) return;
    if (permissionStatus !== NOTIFICATION_PERMISSION_STATE.PROMPT) return;
    if (preferences.pushManuallyDisabled) return;
    if (preferences.notificationStatus === NOTIFICATION_STATUS.GRANTED) return;

    const now = Date.now();
    const last = lastAutoSoftPromptRef.current;
    if (last && now - last < NOTIFICATIONS.softDeclineCooldownMs) return;

    lastAutoSoftPromptRef.current = now;
    tryPromptForPush({ context: 'auto-soft', skipSoftPrompt: false }).catch((error) => {
      analytics.trackError(error as Error, { source: 'notifications:auto-soft' });
    });
  }, [
    analytics,
    permissionStatus,
    preferences.notificationStatus,
    preferences.pushManuallyDisabled,
    tryPromptForPush,
  ]);

  const disablePushNotifications = useCallback(async () => {
    setPushError(null);
    await revokeNotifications();
    updatePreferences((prev) => ({
      ...prev,
      notificationStatus: NOTIFICATION_STATUS.UNKNOWN,
      pushManuallyDisabled: true,
    }));
    analytics.trackEvent('notifications:push-disabled', { status: 'revoked' });
  }, [analytics, updatePreferences]);

  useEffect(() => {
    if (
      permissionStatus === NOTIFICATION_PERMISSION_STATE.BLOCKED ||
      permissionStatus === NOTIFICATION_PERMISSION_STATE.DENIED ||
      permissionStatus === NOTIFICATION_PERMISSION_STATE.UNAVAILABLE
    ) {
      setPushError(null);
    }
  }, [permissionStatus]);

  return {
    ...preferences,
    permissionStatus,
    isSupported: true,
    isChecking,
    error,
    pushError,
    refreshPermissionStatus,
    refreshPreferences,
    tryPromptForPush,
    disablePushNotifications,
    // Soft prompt modal props
    softPrompt: {
      open: softPromptOpen,
      title: t('notifications.softPromptTitle'),
      message: t('notifications.softPromptMessage'),
      allowLabel: t('notifications.softPromptAllow'),
      notNowLabel: t('notifications.softPromptNotNow'),
      onAllow: handleSoftPromptAllow,
      onNotNow: handleSoftPromptDecline,
      setOpen: setSoftPromptOpen,
    },
  };
}
