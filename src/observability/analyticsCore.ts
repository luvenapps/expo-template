import { OBSERVABILITY } from '@/config/constants';
import { DOMAIN } from '@/config/domain.config';
import { Platform } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import { getFirebaseAnalyticsBackend } from './firebaseBackend';

export type AnalyticsEventPayload = Record<string, unknown>;

export type PerformanceMetric = {
  name: string;
  durationMs?: number;
  metadata?: AnalyticsEventPayload;
};

export type AnalyticsEnvelopeBase = {
  timestamp: string;
  distinctId: string;
};

export type AnalyticsEventEnvelope = AnalyticsEnvelopeBase & {
  kind: 'event';
  event: string;
  payload?: AnalyticsEventPayload;
};

export type AnalyticsErrorEnvelope = AnalyticsEnvelopeBase & {
  kind: 'error';
  message: string;
  stack?: string;
  metadata?: AnalyticsEventPayload;
};

export type AnalyticsPerformanceEnvelope = AnalyticsEnvelopeBase & {
  kind: 'performance';
  name: string;
  durationMs?: number;
  metadata?: AnalyticsEventPayload;
};

export type AnalyticsEnvelope =
  | AnalyticsEventEnvelope
  | AnalyticsErrorEnvelope
  | AnalyticsPerformanceEnvelope;

export type AnalyticsBackend = {
  trackEvent: (envelope: AnalyticsEventEnvelope) => void | Promise<void>;
  trackError: (envelope: AnalyticsErrorEnvelope) => void | Promise<void>;
  trackPerformance: (envelope: AnalyticsPerformanceEnvelope) => void | Promise<void>;
};

const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
function isFirebaseEnabled() {
  return (
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === 'true' ||
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === '1'
  );
}
const {
  analyticsStorageKey: ANALYTICS_STORAGE_KEY,
  analyticsStorageNamespace: ANALYTICS_STORAGE_NAMESPACE,
} = DOMAIN.app;
let cachedDistinctId: string | null = null;
let analyticsBackend: AnalyticsBackend | null | undefined;

/* istanbul ignore next - MMKV initialization executes at module load */
function getNativeStore() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MMKV } = require('react-native-mmkv');
    return new MMKV({ id: ANALYTICS_STORAGE_NAMESPACE });
  } catch {
    return null;
  }
}

/* istanbul ignore next - Platform-specific storage paths difficult to test */
function persistDistinctId(id: string) {
  if (Platform.OS === 'web') {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
      const storage = globalThis.localStorage;
      if (storage?.setItem) {
        storage.setItem(ANALYTICS_STORAGE_KEY, id);
      }
    }
    return;
  }

  getNativeStore()?.set(ANALYTICS_STORAGE_KEY, id);
}

/* istanbul ignore next - Platform-specific storage paths difficult to test */
function loadDistinctId() {
  if (cachedDistinctId) return cachedDistinctId;

  try {
    if (Platform.OS === 'web') {
      if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
        const existing = globalThis.localStorage.getItem(ANALYTICS_STORAGE_KEY);
        if (existing) {
          cachedDistinctId = existing;
          return existing;
        }
      }
    } else {
      const existing = getNativeStore()?.getString(ANALYTICS_STORAGE_KEY);
      if (existing) {
        cachedDistinctId = existing;
        return existing;
      }
    }
  } catch {
    // fall through and create new id
  }

  const generated = uuidv4();
  cachedDistinctId = generated;
  persistDistinctId(generated);
  return generated;
}

function logToConsole(level: 'info' | 'warn' | 'error', message: string, payload?: unknown) {
  if (!isDev) return;
  console[level](`[Observability] ${message}`, payload ?? '');
}

function ensureAnalyticsBackend() {
  if (analyticsBackend !== undefined) {
    return analyticsBackend;
  }
  analyticsBackend = getFirebaseAnalyticsBackend();
  return analyticsBackend;
}

function getConfig() {
  return isDev ? OBSERVABILITY.development : OBSERVABILITY.production;
}

function dispatchAnalytics(envelope: AnalyticsEnvelope, backend: AnalyticsBackend | null) {
  if (!backend) return;

  switch (envelope.kind) {
    case 'event':
      void backend.trackEvent(envelope);
      break;
    case 'error':
      void backend.trackError(envelope);
      break;
    case 'performance':
      void backend.trackPerformance(envelope);
      break;
    /* istanbul ignore next - Default case should never be reached with type-safe envelopes */
    default:
      break;
  }
}

export function getAnalyticsDistinctId() {
  return loadDistinctId();
}

export function trackEvent(event: string, payload?: AnalyticsEventPayload) {
  const config = getConfig();
  const firebaseEnabled = isFirebaseEnabled();
  const allowBackend = firebaseEnabled && (isDev || config.analytics.enabled);
  const allowLogging = isDev || allowBackend;
  if (!allowLogging) {
    return;
  }
  const envelope: AnalyticsEnvelope = {
    kind: 'event',
    event,
    payload,
    timestamp: new Date().toISOString(),
    distinctId: loadDistinctId(),
  };
  logToConsole('info', `event:${event}`, envelope);
  if (allowBackend) {
    void dispatchAnalytics(envelope, ensureAnalyticsBackend());
  }
}

export function trackError(error: Error | string, metadata?: AnalyticsEventPayload) {
  const config = getConfig();
  const firebaseEnabled = isFirebaseEnabled();
  const allowBackend = firebaseEnabled && (isDev || config.errorReporting.enabled);
  const allowLogging = isDev || allowBackend;
  if (!allowLogging) {
    return;
  }
  const message = typeof error === 'string' ? error : error.message;
  const stack = typeof error === 'string' ? undefined : error.stack;

  const envelope: AnalyticsEnvelope = {
    kind: 'error',
    message,
    stack,
    metadata,
    timestamp: new Date().toISOString(),
    distinctId: loadDistinctId(),
  };
  logToConsole('error', 'error', { ...envelope, metadata: { ...(metadata ?? {}), stack } });
  if (allowBackend) {
    void dispatchAnalytics(envelope, ensureAnalyticsBackend());
  }
}

export function trackPerformance(metric: PerformanceMetric) {
  const config = getConfig();
  const firebaseEnabled = isFirebaseEnabled();
  const allowBackend = firebaseEnabled && (isDev || config.performance.enabled);
  const allowLogging = isDev || allowBackend;
  if (!allowLogging) {
    return;
  }
  const envelope: AnalyticsEnvelope = {
    kind: 'performance',
    name: metric.name,
    durationMs: metric.durationMs,
    metadata: metric.metadata,
    timestamp: new Date().toISOString(),
    distinctId: loadDistinctId(),
  };
  logToConsole('info', `perf:${metric.name}`, envelope);
  if (allowBackend) {
    void dispatchAnalytics(envelope, ensureAnalyticsBackend());
  }
}

export async function traceAsync<T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: AnalyticsEventPayload,
) {
  const start = Date.now();
  try {
    return await fn();
  } finally {
    const durationMs = Date.now() - start;
    trackPerformance({ name, durationMs, metadata });
  }
}

/* istanbul ignore next */
export function __resetAnalyticsStateForTests() {
  cachedDistinctId = null;
  analyticsBackend = undefined;
}
