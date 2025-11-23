import { Platform } from 'react-native';
import type {
  AnalyticsBackend,
  AnalyticsErrorEnvelope,
  AnalyticsEventEnvelope,
  AnalyticsPerformanceEnvelope,
} from './AnalyticsProvider';

type WebFirebaseApp = import('firebase/app').FirebaseApp;
type WebAnalytics = import('firebase/analytics').Analytics;

const EVENT_NAME_MAX_LENGTH = 40;
const PARAM_NAME_MAX_LENGTH = 24;
const PARAM_LIMIT = 24;

let cachedBackend: AnalyticsBackend | null | undefined;

const webConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export function getFirebaseAnalyticsBackend(): AnalyticsBackend | null {
  if (cachedBackend !== undefined) {
    return cachedBackend;
  }

  cachedBackend =
    Platform.OS === 'web' ? createWebBackendIfAvailable() : createNativeBackendIfAvailable();
  return cachedBackend;
}

function createNativeBackendIfAvailable(): AnalyticsBackend | null {
  if (Platform.OS === 'web') return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const analyticsModule = require('@react-native-firebase/analytics').default;
    const analyticsInstance = analyticsModule();

    return {
      trackEvent: (envelope) => {
        analyticsInstance.setUserId(envelope.distinctId).catch(() => undefined);
        void analyticsInstance.logEvent(
          sanitizeEventName(envelope.event),
          buildPayload(envelope, envelope.payload),
        );
      },
      trackError: (envelope) => {
        analyticsInstance.setUserId(envelope.distinctId).catch(() => undefined);
        void analyticsInstance.logEvent(
          'observability_error',
          buildPayload(envelope, {
            message: envelope.message,
            stack: envelope.stack,
            ...envelope.metadata,
          }),
        );
      },
      trackPerformance: (envelope) => {
        analyticsInstance.setUserId(envelope.distinctId).catch(() => undefined);
        void analyticsInstance.logEvent(
          'observability_perf',
          buildPayload(envelope, {
            metric_name: envelope.name,
            durationMs: envelope.durationMs,
            ...envelope.metadata,
          }),
        );
      },
    };
  } catch {
    return null;
  }
}

function createWebBackendIfAvailable(): AnalyticsBackend | null {
  if (Platform.OS !== 'web') return null;
  if (typeof window === 'undefined') return null;
  if (!hasCompleteWebConfig()) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { initializeApp, getApps } = require('firebase/app') as typeof import('firebase/app');

    const { getAnalytics, logEvent, setUserId } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('firebase/analytics') as typeof import('firebase/analytics');

    const firebaseApp = ensureWebApp(getApps, initializeApp);
    const analyticsInstance = getAnalytics(firebaseApp as WebFirebaseApp);

    const nativeBackend: AnalyticsBackend = {
      trackEvent: (envelope: AnalyticsEventEnvelope) => {
        setUserId(analyticsInstance as WebAnalytics, envelope.distinctId);
        logEvent(
          analyticsInstance as WebAnalytics,
          sanitizeEventName(envelope.event),
          buildPayload(envelope, envelope.payload),
        );
      },
      trackError: (envelope: AnalyticsErrorEnvelope) => {
        setUserId(analyticsInstance as WebAnalytics, envelope.distinctId);
        logEvent(
          analyticsInstance as WebAnalytics,
          'observability_error',
          buildPayload(envelope, {
            message: envelope.message,
            stack: envelope.stack,
            ...envelope.metadata,
          }),
        );
      },
      trackPerformance: (envelope: AnalyticsPerformanceEnvelope) => {
        setUserId(analyticsInstance as WebAnalytics, envelope.distinctId);
        logEvent(
          analyticsInstance as WebAnalytics,
          'observability_perf',
          buildPayload(envelope, {
            metric_name: envelope.name,
            durationMs: envelope.durationMs,
            ...envelope.metadata,
          }),
        );
      },
    };

    return nativeBackend;
  } catch {
    return null;
  }
}

function ensureWebApp(
  getApps: typeof import('firebase/app').getApps,
  initializeApp: typeof import('firebase/app').initializeApp,
) {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return existingApps[0];
  }
  return initializeApp(webConfig);
}

function hasCompleteWebConfig() {
  return Object.values(webConfig).every((value) => typeof value === 'string' && value.length > 0);
}

function sanitizeEventName(name: string) {
  const normalized = name.trim().replace(/[^a-zA-Z0-9_]/g, '_');
  const trimmed = normalized.slice(0, EVENT_NAME_MAX_LENGTH);
  if (!trimmed) return 'custom_event';
  if (!/^[a-zA-Z]/.test(trimmed)) {
    return `event_${trimmed}`;
  }
  return trimmed;
}

function sanitizeParamName(name: string) {
  const normalized = name.trim().replace(/[^a-zA-Z0-9_]/g, '_');
  const trimmed = normalized.slice(0, PARAM_NAME_MAX_LENGTH);
  if (!trimmed) return 'param';
  if (!/^[a-zA-Z]/.test(trimmed)) {
    return `param_${trimmed}`;
  }
  return trimmed;
}

function buildPayload(
  envelope: AnalyticsEventEnvelope | AnalyticsErrorEnvelope | AnalyticsPerformanceEnvelope,
  payload?: Record<string, unknown>,
) {
  const mergedEntries = Object.entries({
    ...payload,
    distinctId: envelope.distinctId,
    timestamp: envelope.timestamp,
  });

  const sanitized: Record<string, string | number | boolean> = {};
  for (const [key, value] of mergedEntries) {
    if (Object.keys(sanitized).length >= PARAM_LIMIT) break;
    if (value === null || value === undefined) continue;

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      sanitized[sanitizeParamName(key)] = value;
      continue;
    }

    try {
      sanitized[sanitizeParamName(key)] = JSON.stringify(value).slice(0, 100);
    } catch {
      sanitized[sanitizeParamName(key)] = String(value);
    }
  }

  return sanitized;
}
