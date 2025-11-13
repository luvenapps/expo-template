import { DOMAIN } from '@/config/domain.config';
import PostHog, { PostHogProvider } from 'posthog-react-native';
import { createContext, PropsWithChildren, useContext, useMemo } from 'react';
import { Platform } from 'react-native';
import { v4 as uuidv4 } from 'uuid';

// Safely import expo-device with fallback
let Device: any = {
  osVersion: undefined,
  modelName: undefined,
  manufacturer: undefined,
  deviceYearClass: undefined,
  osBuildId: undefined,
};

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const DeviceModule = require('expo-device');
  Device = DeviceModule;
} catch {
  // expo-device not available, use defaults
}

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
let posthogClient: PostHog | null = null;

function getAnalyticsConfig() {
  const host =
    process.env.EXPO_PUBLIC_ANALYTICS_HOST ?? process.env.EXPO_PUBLIC_ANALYTICS_ENDPOINT ?? '';
  const writeKey = process.env.EXPO_PUBLIC_ANALYTICS_WRITE_KEY ?? '';
  return { host, writeKey };
}

function sanitizeHost(host: string) {
  if (!host) return '';
  return host.replace(/\/capture\/?$/, '').replace(/\/$/, '');
}

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

function ensurePosthogClient() {
  if (posthogClient) return posthogClient;

  const { host, writeKey } = getAnalyticsConfig();
  if (!writeKey) return null;

  const sanitizedHost = sanitizeHost(host || 'https://app.posthog.com');
  if (!sanitizedHost) return null;

  try {
    posthogClient = new PostHog(writeKey, {
      host: sanitizedHost,
      captureAppLifecycleEvents: true,
      enablePersistSessionIdAcrossRestart: true,
      customStorage: getPosthogStorage(),
    });
    posthogClient.identify(loadDistinctId());
    const deviceType =
      Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : 'Web';
    const deviceProps = {
      $device_type: deviceType,
      $os: Platform.OS,
      $os_version: Device.osVersion,
      $device_name: Device.modelName,
      $device_manufacturer: Device.manufacturer,
      $device_year_class: Device.deviceYearClass,
      $app_name: DOMAIN.app.displayName,
      $app_version: Device.osBuildId,
    };
    void posthogClient.register(
      Object.fromEntries(
        Object.entries(deviceProps).filter(
          ([_key, value]) => value !== undefined && value !== null,
        ),
      ) as Record<string, number | string | boolean>,
    );
    /* istanbul ignore next - PostHog initialization errors are rare and hard to simulate */
  } catch (error) {
    logToConsole('warn', 'analytics:init-failed', { message: (error as Error).message });
    posthogClient = null;
  }

  return posthogClient;
}

export function AnalyticsProvider({ children }: PropsWithChildren) {
  const client = ensurePosthogClient();
  const value = useMemo<AnalyticsContextValue>(() => {
    const trackEvent = (event: string, payload?: AnalyticsEventPayload) => {
      const envelope: AnalyticsEnvelope = {
        kind: 'event',
        event,
        payload,
        timestamp: new Date().toISOString(),
      };
      logToConsole('info', `event:${event}`, envelope);
      void dispatchAnalytics(envelope, client);
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
      void dispatchAnalytics(envelope, client);
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
      void dispatchAnalytics(envelope, client);
    };

    return {
      trackEvent,
      trackError,
      trackPerformance,
    };
  }, [client]);

  const content = <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;

  if (client) {
    return <PostHogProvider client={client}>{content}</PostHogProvider>;
  }

  /* istanbul ignore next - Fallback when PostHog client initialization fails */
  return content;
}

export function useAnalytics() {
  return useContext(AnalyticsContext);
}

function dispatchAnalytics(envelope: AnalyticsEnvelope, client: PostHog | null) {
  if (!client) return;

  switch (envelope.kind) {
    case 'event':
      void client.capture(envelope.event, {
        ...envelope.payload,
        timestamp: envelope.timestamp,
      });
      break;
    case 'error':
      const errorProps: Record<string, any> = {
        message: envelope.message,
        timestamp: envelope.timestamp,
        ...envelope.metadata,
      };
      if (envelope.stack) {
        errorProps.stack = envelope.stack;
      }
      void client.capture('observability:error', {
        ...errorProps,
      });
      break;
    case 'performance':
      const perfProps: Record<string, any> = {
        ...envelope.metadata,
        timestamp: envelope.timestamp,
      };
      if (typeof envelope.durationMs === 'number') {
        perfProps.durationMs = envelope.durationMs;
      }
      void client.capture(`observability:perf:${envelope.name}`, {
        ...perfProps,
      });
      break;
    /* istanbul ignore next - Default case should never be reached with type-safe envelopes */
    default:
      break;
  }
}

type BasicStorage = {
  setItem: (key: string, value: string) => Promise<void> | void;
  getItem: (key: string) => Promise<string | null> | (string | null);
  removeItem: (key: string) => Promise<void> | void;
};

function getPosthogStorage(): BasicStorage {
  if (Platform.OS === 'web') {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
      return {
        setItem: (key, value) => {
          globalThis.localStorage.setItem(key, value);
        },
        getItem: (key) => globalThis.localStorage.getItem(key),
        removeItem: (key) => {
          globalThis.localStorage.removeItem(key);
        },
      };
    }
  } else {
    const nativeStore = getNativeStore();
    if (nativeStore) {
      return {
        setItem: (key, value) => {
          nativeStore.set(key, value);
        },
        getItem: (key) => nativeStore.getString(key) ?? null,
        removeItem: (key) => {
          nativeStore.delete(key);
        },
      };
    }
  }

  const memory = new Map<string, string>();
  return {
    setItem: (key, value) => {
      memory.set(key, value);
    },
    getItem: (key) => memory.get(key) ?? null,
    removeItem: (key) => {
      memory.delete(key);
    },
  };
}
