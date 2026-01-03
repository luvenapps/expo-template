/* istanbul ignore file */
import { ANALYTICS } from '@/config/constants';
import { createLogger } from '@/observability/logger';
import { Platform } from 'react-native';
import type {
  AnalyticsBackend,
  AnalyticsErrorEnvelope,
  AnalyticsEventEnvelope,
  AnalyticsPerformanceEnvelope,
} from './analyticsCore';

type WebFirebaseApp = import('firebase/app').FirebaseApp;
type WebAnalytics = import('firebase/analytics').Analytics;

let cachedBackend: AnalyticsBackend | null | undefined;
const logger = createLogger('Firebase');

const turnOnFirebase =
  process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === 'true' ||
  process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === '1';

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
  if (!turnOnFirebase) {
    logger.info('TURN_ON_FIREBASE is false; analytics disabled.');
    cachedBackend = null;
    return null;
  }

  if (cachedBackend !== undefined) {
    return cachedBackend;
  }

  cachedBackend =
    Platform.OS === 'web' ? createWebBackendIfAvailable() : createNativeBackendIfAvailable();

  if (cachedBackend) {
    logger.info('Analytics backend initialized successfully for platform:', Platform.OS);
  } else {
    logger.warn('Analytics backend is NULL - events will not be sent');
  }

  return cachedBackend;
}

function createNativeBackendIfAvailable(): AnalyticsBackend | null {
  if (Platform.OS === 'web') return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const analytics = require('@react-native-firebase/analytics');
    if (!analytics?.default) {
      logger.warn(
        'Native analytics module not available. Rebuild the app after running: npx expo prebuild --clean',
      );
      return null;
    }

    // Cache the analytics instance
    // Note: Deprecation warnings are expected - v22 modular API not yet available in v23
    const analyticsInstance = analytics.default();

    return {
      trackEvent: (envelope) => {
        const eventName = sanitizeEventName(envelope.event);
        const payload = buildPayload(envelope, envelope.payload);
        logger.debug('Sending native event:', { eventName, payload });
        analyticsInstance
          .setUserId(envelope.distinctId)
          .then(() => {
            logger.debug('User ID set successfully');
          })
          .catch((err: Error) => {
            logger.error('Failed to set user ID:', err);
          });
        analyticsInstance
          .logEvent(eventName, payload)
          .then(() => {
            logger.debug('Event logged successfully:', eventName);
          })
          .catch((err: Error) => {
            logger.error('Failed to log event:', { eventName, err });
          });
      },
      trackError: (envelope) => {
        void analyticsInstance.setUserId(envelope.distinctId);
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
        void analyticsInstance.setUserId(envelope.distinctId);
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
    logger.warn(
      'Failed to initialize native analytics. You may need to rebuild: npx expo prebuild --clean',
    );
    return null;
  }
}

function createWebBackendIfAvailable(): AnalyticsBackend | null {
  if (Platform.OS !== 'web') return null;
  if (typeof window === 'undefined') return null;

  if (!hasCompleteWebConfig()) {
    logger.warn('Web config incomplete:', webConfig);
    return null;
  }

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
        const eventName = sanitizeEventName(envelope.event);
        const payload = buildPayload(envelope, envelope.payload);
        logger.debug('Sending web event:', { eventName, payload });
        setUserId(analyticsInstance as WebAnalytics, envelope.distinctId);
        logEvent(analyticsInstance as WebAnalytics, eventName, payload);
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
  const trimmed = normalized.slice(0, ANALYTICS.eventNameMaxLength);
  if (!trimmed) return 'custom_event';
  if (!/^[a-zA-Z]/.test(trimmed)) {
    return `event_${trimmed}`;
  }
  return trimmed;
}

function sanitizeParamName(name: string) {
  const normalized = name.trim().replace(/[^a-zA-Z0-9_]/g, '_');
  const trimmed = normalized.slice(0, ANALYTICS.paramNameMaxLength);
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
    if (Object.keys(sanitized).length >= ANALYTICS.paramLimit) break;
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
