import { DOMAIN } from '@/config/domain.config';
import { createContext, PropsWithChildren, useContext, useMemo } from 'react';
import { Platform } from 'react-native';
import { v4 as uuidv4 } from 'uuid';

export type AnalyticsEventPayload = Record<string, unknown>;

export type PerformanceMetric = {
  name: string;
  durationMs?: number;
  metadata?: AnalyticsEventPayload;
};

type AnalyticsContextValue = {
  trackEvent: (event: string, payload?: AnalyticsEventPayload) => void;
  trackError: (error: Error | string, metadata?: AnalyticsEventPayload) => void;
  trackPerformance: (metric: PerformanceMetric) => void;
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

function getAnalyticsConfig() {
  return {
    endpoint: process.env.EXPO_PUBLIC_ANALYTICS_ENDPOINT ?? '',
    writeKey: process.env.EXPO_PUBLIC_ANALYTICS_WRITE_KEY ?? '',
  };
}

function getNativeStore() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MMKV } = require('react-native-mmkv');
    return new MMKV({ id: ANALYTICS_STORAGE_NAMESPACE });
  } catch {
    return null;
  }
}

function persistDistinctId(id: string) {
  if (Platform.OS === 'web') {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
      globalThis.localStorage.setItem(ANALYTICS_STORAGE_KEY, id);
    }
    return;
  }
  getNativeStore()?.set(ANALYTICS_STORAGE_KEY, id);
}

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

type AnalyticsEnvelope =
  | {
      kind: 'event';
      event: string;
      payload?: AnalyticsEventPayload;
      timestamp: string;
    }
  | {
      kind: 'error';
      message: string;
      stack?: string;
      metadata?: AnalyticsEventPayload;
      timestamp: string;
    }
  | {
      kind: 'performance';
      name: string;
      durationMs?: number;
      metadata?: AnalyticsEventPayload;
      timestamp: string;
    };

async function sendAnalytics(envelope: AnalyticsEnvelope) {
  const { endpoint, writeKey } = getAnalyticsConfig();
  if (!endpoint || !writeKey) return;

  const isPosthog = endpoint.includes('posthog');

  try {
    if (isPosthog) {
      const distinctId = loadDistinctId();
      const posthogBody = mapEnvelopeToPosthog(envelope, distinctId, writeKey);
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(posthogBody),
      });
      return;
    }

    await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${writeKey}`,
      },
      body: JSON.stringify(envelope),
    });
  } catch (error) {
    logToConsole('warn', 'analytics:failed', { message: (error as Error).message });
  }
}

type PosthogPayload = {
  api_key: string;
  event: string;
  distinct_id: string;
  properties?: Record<string, unknown>;
  timestamp: string;
};

function mapEnvelopeToPosthog(
  envelope: AnalyticsEnvelope,
  distinctId: string,
  writeKey: string,
): PosthogPayload {
  const base: PosthogPayload = {
    api_key: writeKey,
    event: '',
    distinct_id: distinctId,
    timestamp: envelope.timestamp,
    properties: {
      $lib: DOMAIN.app.name,
    },
  };

  switch (envelope.kind) {
    case 'event':
      return {
        ...base,
        event: envelope.event,
        properties: {
          ...base.properties,
          kind: 'event',
          ...envelope.payload,
        },
      };
    case 'error':
      return {
        ...base,
        event: 'observability:error',
        properties: {
          ...base.properties,
          kind: 'error',
          message: envelope.message,
          stack: envelope.stack,
          ...envelope.metadata,
        },
      };
    case 'performance':
    default:
      return {
        ...base,
        event: `observability:perf:${envelope.name}`,
        properties: {
          ...base.properties,
          kind: 'performance',
          durationMs: envelope.durationMs,
          ...envelope.metadata,
        },
      };
  }
}

export function AnalyticsProvider({ children }: PropsWithChildren) {
  const value = useMemo<AnalyticsContextValue>(() => {
    const trackEvent = (event: string, payload?: AnalyticsEventPayload) => {
      const envelope: AnalyticsEnvelope = {
        kind: 'event',
        event,
        payload,
        timestamp: new Date().toISOString(),
      };
      logToConsole('info', `event:${event}`, envelope);
      void sendAnalytics(envelope);
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
      };
      logToConsole('error', 'error', { ...envelope, metadata: { ...(metadata ?? {}), stack } });
      void sendAnalytics(envelope);
    };

    const trackPerformance = (metric: PerformanceMetric) => {
      const envelope: AnalyticsEnvelope = {
        kind: 'performance',
        name: metric.name,
        durationMs: metric.durationMs,
        metadata: metric.metadata,
        timestamp: new Date().toISOString(),
      };
      logToConsole('info', `perf:${metric.name}`, envelope);
      void sendAnalytics(envelope);
    };

    return {
      trackEvent,
      trackError,
      trackPerformance,
    };
  }, []);

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function useAnalytics() {
  return useContext(AnalyticsContext);
}
