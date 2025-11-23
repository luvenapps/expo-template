import { DOMAIN } from '@/config/domain.config';
import { createContext, PropsWithChildren, useContext, useMemo } from 'react';
import { Platform } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import { getFirebaseAnalyticsBackend } from './firebaseBackend';

export type AnalyticsEventPayload = Record<string, unknown>;

export type PerformanceMetric = {
  name: string;
  durationMs?: number;
  metadata?: AnalyticsEventPayload;
};

export type AnalyticsContextValue = {
  trackEvent: (event: string, payload?: AnalyticsEventPayload) => void;
  trackError: (error: Error | string, metadata?: AnalyticsEventPayload) => void;
  trackPerformance: (metric: PerformanceMetric) => void;
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

const noop = () => {
  /* no-op */
};

const AnalyticsContext = createContext<AnalyticsContextValue>({
  trackEvent: noop,
  trackError: noop,
  trackPerformance: noop,
});

const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
const ANALYTICS_STORAGE_KEY = `${DOMAIN.app.storageKey}-analytics-id`;
const ANALYTICS_STORAGE_NAMESPACE = `${DOMAIN.app.cursorStorageId}-analytics`;
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
      globalThis.localStorage.setItem(ANALYTICS_STORAGE_KEY, id);
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

export function AnalyticsProvider({ children }: PropsWithChildren) {
  const backend = ensureAnalyticsBackend();
  const distinctId = useMemo(() => loadDistinctId(), []);
  const value = useMemo<AnalyticsContextValue>(() => {
    const trackEvent = (event: string, payload?: AnalyticsEventPayload) => {
      const envelope: AnalyticsEnvelope = {
        kind: 'event',
        event,
        payload,
        timestamp: new Date().toISOString(),
        distinctId,
      };
      logToConsole('info', `event:${event}`, envelope);
      void dispatchAnalytics(envelope, backend);
    };

    const trackError = (error: Error | string, metadata?: AnalyticsEventPayload) => {
      const message = typeof error === 'string' ? error : error.message;
      const stack = typeof error === 'string' ? undefined : error.stack;

      const envelope: AnalyticsEnvelope = {
        kind: 'error',
        message,
        stack,
        metadata,
        timestamp: new Date().toISOString(),
        distinctId,
      };
      logToConsole('error', 'error', { ...envelope, metadata: { ...(metadata ?? {}), stack } });
      void dispatchAnalytics(envelope, backend);
    };

    const trackPerformance = (metric: PerformanceMetric) => {
      const envelope: AnalyticsEnvelope = {
        kind: 'performance',
        name: metric.name,
        durationMs: metric.durationMs,
        metadata: metric.metadata,
        timestamp: new Date().toISOString(),
        distinctId,
      };
      logToConsole('info', `perf:${metric.name}`, envelope);
      void dispatchAnalytics(envelope, backend);
    };

    return {
      trackEvent,
      trackError,
      trackPerformance,
    };
  }, [backend, distinctId]);

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function useAnalytics() {
  return useContext(AnalyticsContext);
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

/* istanbul ignore next */
export function __resetAnalyticsStateForTests() {
  cachedDistinctId = null;
  analyticsBackend = undefined;
}
