import type { ToastType } from '@/ui/components/Toast';

export type FriendlyErrorCode =
  | 'network.offline'
  | 'network.timeout'
  | 'sqlite.constraint'
  | 'sqlite.storage-full'
  | 'sqlite.busy'
  | 'auth.invalid-credentials'
  | 'auth.rate-limit'
  | 'notifications.permission'
  | 'unknown';

export type FriendlyError = {
  code: FriendlyErrorCode;
  title: string;
  description?: string;
  type: ToastType;
  originalMessage?: string;
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
      title: 'Check your connection',
      description: 'We could not reach the server. Please verify your connection and try again.',
      type: 'error',
      originalMessage: message,
    };
  }

  if (SQLITE_CONSTRAINT.test(message)) {
    return {
      code: 'sqlite.constraint',
      title: 'Already saved',
      description: 'Looks like this entry already exists. Try renaming it or editing the original.',
      type: 'error',
      originalMessage: message,
    };
  }

  if (SQLITE_FULL.test(message)) {
    return {
      code: 'sqlite.storage-full',
      title: 'Device storage is full',
      description: 'Free up space on your device, then try the action again.',
      type: 'error',
      originalMessage: message,
    };
  }

  if (SQLITE_BUSY.test(message)) {
    return {
      code: 'sqlite.busy',
      title: 'Database is busy',
      description: 'Please wait a moment and try again.',
      type: 'info',
      originalMessage: message,
    };
  }

  if (AUTH_INVALID.test(message)) {
    return {
      code: 'auth.invalid-credentials',
      title: 'Invalid email or password',
      description: 'Double-check your credentials and try again.',
      type: 'error',
      originalMessage: message,
    };
  }

  if (AUTH_RATE_LIMIT.test(message)) {
    return {
      code: 'auth.rate-limit',
      title: 'Too many attempts',
      description: 'Please wait a moment before trying again.',
      type: 'info',
      originalMessage: message,
    };
  }

  if (NOTIFICATION_PERMISSION.test(message)) {
    return {
      code: 'notifications.permission',
      title: 'Notifications unavailable',
      description:
        'We could not reach the notification service. Check your connection or retry later.',
      type: 'error',
      originalMessage: message,
    };
  }

  return {
    code: 'unknown',
    title: 'Something went wrong',
    description: message || 'Please try again.',
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
