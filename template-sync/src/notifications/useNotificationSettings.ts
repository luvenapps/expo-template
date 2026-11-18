import { NOTIFICATIONS } from '@/config/constants';
import {
  ensureNotificationsEnabled,
  revokeNotifications,
} from '@/notifications/notificationSystem';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
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

import { onNotificationEvent } from '@/observability/notificationEvents';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Platform } from 'react-native';

function getInitialPreferences(): NotificationPreferences {
  const loaded = loadNotificationPreferences();
  return loaded ?? DEFAULT_NOTIFICATION_PREFERENCES;
}

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

function isMobileWebContext(): boolean {
  return (
    Platform.OS === 'web' &&
    typeof navigator !== 'undefined' &&
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  );
}

type UseNotificationSettingsOptions = {
  autoPromptEnabled?: boolean;
};

export function useNotificationSettings(options?: UseNotificationSettingsOptions) {
  const analytics = useAnalytics();
  const { t } = useTranslation();
  const mobileWeb = isMobileWebContext();
  const [preferences, setPreferences] = useState<NotificationPreferences>(() =>
    getInitialPreferences(),
  );
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionState>(
    // Keep first render deterministic across SSR/client hydration on web.
    mobileWeb ? NOTIFICATION_PERMISSION_STATE.UNAVAILABLE : NOTIFICATION_PERMISSION_STATE.PROMPT,
  );
  const [error, setError] = useState<string | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [softPromptOpen, setSoftPromptOpen] = useState(false);
  const [softPromptContext, setSoftPromptContext] = useState<string | undefined>(undefined);
  const [hasResolvedInitialPermission, setHasResolvedInitialPermission] = useState(
    Platform.OS !== 'web',
  );
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
        // Only persist when something actually changed to avoid overwriting valid storage state.
        if (value !== prev) {
          persistNotificationPreferences(value);
        }
        return value;
      });
    },
    [],
  );

  const refreshPermissionStatus = useCallback(async () => {
    setIsChecking(true);
    try {
      if (isMobileWebContext()) {
        setPermissionStatus(NOTIFICATION_PERMISSION_STATE.UNAVAILABLE);
        return NOTIFICATION_PERMISSION_STATE.UNAVAILABLE;
      }

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
      setHasResolvedInitialPermission(true);
    }
  }, [analytics, t]);

  const refreshPreferences = useCallback(() => {
    setPreferences(getInitialPreferences());
  }, []);

  useEffect(() => {
    refreshPermissionStatus().catch(() => undefined);
  }, [refreshPermissionStatus]);

  // Keep preferences in sync when OS/browser permission changes (e.g., user blocks in Settings)
  useEffect(() => {
    if (Platform.OS === 'web' && !hasResolvedInitialPermission) return;

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

    if (permissionStatus === NOTIFICATION_PERMISSION_STATE.GRANTED) {
      // OS/browser permission is granted. Silently re-register when we don't have a valid
      // push token yet — covers storage reset, reinstall, and transient registration failures.
      // Skip when the user explicitly disabled push or notifications are already registered.
      // forceRegister bypasses the stored 'denied' early-return so a user who re-enables
      // permission in OS settings gets a token without having to toggle the switch.
      if (
        !preferences.pushManuallyDisabled &&
        preferences.notificationStatus !== NOTIFICATION_STATUS.GRANTED &&
        preferences.notificationStatus !== NOTIFICATION_STATUS.SOFT_DECLINED
      ) {
        ensureNotificationsEnabled({ forceRegister: true }).then(() => {
          setPreferences(getInitialPreferences());
        });
      }
      return;
    }

    if (permissionStatus === NOTIFICATION_PERMISSION_STATE.PROMPT) {
      // Permission reset to default: keep soft-decline history, only reset hard-denial state.
      // Do NOT reset GRANTED here — if stored status is 'granted' but permission shows 'prompt',
      // we may be in a transient initial-render state before refreshPermissionStatus resolves.
      // Resetting 'granted' → 'unknown' here causes the toggle to flicker off on reload.
      updatePreferences((prev) => {
        if (prev.notificationStatus === NOTIFICATION_STATUS.SOFT_DECLINED) return prev;
        if (prev.notificationStatus === NOTIFICATION_STATUS.UNKNOWN) return prev;
        if (prev.notificationStatus === NOTIFICATION_STATUS.GRANTED) return prev;
        if (
          prev.notificationStatus === NOTIFICATION_STATUS.DENIED ||
          prev.notificationStatus === NOTIFICATION_STATUS.UNAVAILABLE
        ) {
          return { ...prev, notificationStatus: NOTIFICATION_STATUS.UNKNOWN };
        }
        return prev;
      });
    }
  }, [
    hasResolvedInitialPermission,
    permissionStatus,
    preferences.notificationStatus,
    preferences.pushManuallyDisabled,
    updatePreferences,
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

    setSoftPromptOpen(false);
    setSoftPromptContext(undefined);

    if (result.status !== 'denied') {
      // Reload preferences from storage (ensureNotificationsEnabled owns the write).
      // Then refresh permission status so permissionStatus reflects the live browser state.
      setPreferences(getInitialPreferences());
      await refreshPermissionStatus();
    }
  }, [softPromptContext, refreshPermissionStatus]);

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
      const latestPreferences = getInitialPreferences();
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
        // On web with Firebase gated off, push token registration is unavailable but the
        // browser permission may already be granted. Clear the manual-off flag so the toggle
        // reflects the granted permission state (in-app enable without a push token).
        if (Platform.OS === 'web' && latestPermission === NOTIFICATION_PERMISSION_STATE.GRANTED) {
          updatePreferences({
            ...getInitialPreferences(),
            pushManuallyDisabled: false,
          });
          return { status: 'triggered' as const, registered: false };
        }
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
    if (options?.autoPromptEnabled === false) return;

    const shouldAutoPrompt =
      NOTIFICATIONS.initialSoftPromptTrigger === 'app-install' ||
      (Platform.OS === 'web' && NOTIFICATIONS.initialSoftPromptTrigger === 'first-entry');
    if (!shouldAutoPrompt) return;
    if (Platform.OS === 'web' && !hasResolvedInitialPermission) return;
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
    hasResolvedInitialPermission,
    permissionStatus,
    preferences.notificationStatus,
    preferences.pushManuallyDisabled,
    tryPromptForPush,
    options?.autoPromptEnabled,
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
    isSupported: !mobileWeb,
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
