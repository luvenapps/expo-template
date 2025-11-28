import type { ToastType } from '@/ui/components/Toast';

export type FriendlyErrorCode =
  | 'network.offline'
  | 'network.timeout'
  | 'sqlite.constraint'
  | 'sqlite.storage-full'
  | 'sqlite.busy'
  | 'auth.invalid-credentials'
  | 'auth.oauth.browser'
  | 'auth.rate-limit'
  | 'notifications.permission'
  | 'unknown';

export type FriendlyError = {
  code: FriendlyErrorCode;
  titleKey?: string;
  descriptionKey?: string;
  type: ToastType;
  originalMessage?: string;
  // Legacy fields for callers/tests that still pass raw strings
  title?: string;
  description?: string;
};

type NormalizedError = {
  message: string;
  name?: string;
};

const NETWORK_PATTERNS = [/network request failed/i, /failed to fetch/i, /request timed out/i];
const SQLITE_CONSTRAINT = /sqlite_constraint/i;
const SQLITE_FULL = /database or disk is full/i;
const SQLITE_BUSY = /database is locked/i;
const AUTH_INVALID = /invalid login credentials/i;
const AUTH_RATE_LIMIT = /too many requests/i;
const NOTIFICATION_PERMISSION = /failed to send a request to the edge function/i;

export function resolveFriendlyError(error: unknown): FriendlyError {
  const normalized = normalize(error);
  const message = normalized.message;

  if (NETWORK_PATTERNS.some((pattern) => pattern.test(message))) {
    return {
      code: 'network.offline',
      titleKey: 'errors.network.offline.title',
      descriptionKey: 'errors.network.offline.description',
      type: 'error',
      originalMessage: message,
    };
  }

  if (SQLITE_CONSTRAINT.test(message)) {
    return {
      code: 'sqlite.constraint',
      titleKey: 'errors.sqlite.constraint.title',
      descriptionKey: 'errors.sqlite.constraint.description',
      type: 'error',
      originalMessage: message,
    };
  }

  if (SQLITE_FULL.test(message)) {
    return {
      code: 'sqlite.storage-full',
      titleKey: 'errors.sqlite.storageFull.title',
      descriptionKey: 'errors.sqlite.storageFull.description',
      type: 'error',
      originalMessage: message,
    };
  }

  if (SQLITE_BUSY.test(message)) {
    return {
      code: 'sqlite.busy',
      titleKey: 'errors.sqlite.busy.title',
      descriptionKey: 'errors.sqlite.busy.description',
      type: 'info',
      originalMessage: message,
    };
  }

  if (AUTH_INVALID.test(message)) {
    return {
      code: 'auth.invalid-credentials',
      titleKey: 'errors.auth.invalidCredentials.title',
      descriptionKey: 'errors.auth.invalidCredentials.description',
      type: 'error',
      originalMessage: message,
    };
  }

  if (AUTH_RATE_LIMIT.test(message)) {
    return {
      code: 'auth.rate-limit',
      titleKey: 'errors.auth.rateLimit.title',
      descriptionKey: 'errors.auth.rateLimit.description',
      type: 'info',
      originalMessage: message,
    };
  }

  if (NOTIFICATION_PERMISSION.test(message)) {
    return {
      code: 'notifications.permission',
      titleKey: 'errors.notifications.permission.title',
      descriptionKey: 'errors.notifications.permission.description',
      type: 'error',
      originalMessage: message,
    };
  }

  return {
    code: 'unknown',
    titleKey: 'errors.unknown.title',
    descriptionKey: message ? undefined : 'errors.unknown.description',
    type: 'error',
    originalMessage: message,
  };
}

function normalize(error: unknown): NormalizedError {
  if (error instanceof Error) {
    return { message: error.message, name: error.name };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  return { message: 'Unexpected error' };
}
