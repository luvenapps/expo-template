// App-level persisted preference status values.
export const NOTIFICATION_STATUS = {
  UNKNOWN: 'unknown',
  SOFT_DECLINED: 'soft-declined',
  GRANTED: 'granted',
  DENIED: 'denied',
  UNAVAILABLE: 'unavailable',
} as const;

export type NotificationStatus = (typeof NOTIFICATION_STATUS)[keyof typeof NOTIFICATION_STATUS];

// Normalized OS/browser permission state used by UI/logic.
export const NOTIFICATION_PERMISSION_STATE = {
  PROMPT: 'prompt',
  GRANTED: 'granted',
  BLOCKED: 'blocked',
  DENIED: 'denied',
  UNAVAILABLE: 'unavailable',
} as const;

export type NotificationPermissionState =
  (typeof NOTIFICATION_PERMISSION_STATE)[keyof typeof NOTIFICATION_PERMISSION_STATE];

// Platform adapter return statuses for request/revoke operations.
export const NOTIFICATION_PLATFORM_STATUS = {
  GRANTED: 'granted',
  DENIED: 'denied',
  UNAVAILABLE: 'unavailable',
} as const;

export type NotificationPlatformStatus =
  (typeof NOTIFICATION_PLATFORM_STATUS)[keyof typeof NOTIFICATION_PLATFORM_STATUS];

// Browser Notification.permission values (external API).
export const WEB_NOTIFICATION_PERMISSION = {
  GRANTED: 'granted',
  DENIED: 'denied',
  DEFAULT: 'default',
} as const;

export type WebNotificationPermission =
  (typeof WEB_NOTIFICATION_PERMISSION)[keyof typeof WEB_NOTIFICATION_PERMISSION];
