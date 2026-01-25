import { createLogger } from '@/observability/logger';
import { AppState, Platform } from 'react-native';
import {
  DEFAULT_FLAGS,
  FeatureFlagClient,
  FeatureFlagKey,
  FeatureFlagStatus,
  FeatureFlagValue,
} from '../types';

const logger = createLogger('FeatureFlags');
const MIN_FETCH_INTERVAL_MS = __DEV__ ? 0 : 60 * 1000;
const MIN_FOREGROUND_REFRESH_MS = 60 * 1000;

type RemoteConfigModule = {
  setConfigSettings: (settings: { minimumFetchIntervalMillis: number }) => Promise<void>;
  setDefaults: (defaults: Record<string, FeatureFlagValue>) => Promise<void>;
  fetchAndActivate: () => Promise<boolean>;
  activate: () => Promise<boolean>;
  getValue: (key: string) => {
    asBoolean: () => boolean;
    asNumber: () => number;
    asString: () => string;
    getSource: () => 'default' | 'remote' | 'static';
  };
  onConfigUpdated?: (listener: (event?: { updatedKeys?: string[] }) => void) => () => void;
};

const webConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

function hasCompleteWebConfig() {
  return Object.values(webConfig).every((value) => typeof value === 'string' && value.length > 0);
}

function getNativeRemoteConfig(): RemoteConfigModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const remoteConfig = require('@react-native-firebase/remote-config').default;
    return remoteConfig();
  } catch (error) {
    logger.warn('Native Remote Config not available, using defaults', error);
    return null;
  }
}

function getWebRemoteConfig(onAppCreated?: (app: unknown) => void): RemoteConfigModule | null {
  if (typeof window === 'undefined') {
    logger.warn('Web Remote Config not available (no window)');
    return null;
  }

  if (!hasCompleteWebConfig()) {
    logger.warn('Web config incomplete, Remote Config disabled', {
      hasApiKey: !!webConfig.apiKey,
      hasProjectId: !!webConfig.projectId,
      hasAppId: !!webConfig.appId,
    });
    return null;
  }

  try {
    const { initializeApp, getApps, deleteApp } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('firebase/app') as typeof import('firebase/app');
    const {
      getRemoteConfig: getWebRC,
      fetchAndActivate: webFetchAndActivate,
      activate: webActivate,
      getValue: webGetValue,
    } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('firebase/remote-config') as typeof import('firebase/remote-config');

    // Delete existing apps on dev hot reload to force re-initialization
    if (__DEV__) {
      const existingApps = getApps();
      for (const app of existingApps) {
        try {
          deleteApp(app as Parameters<typeof deleteApp>[0]);
          logger.debug('Deleted existing Firebase app for hot reload');
        } catch (error) {
          logger.debug('Could not delete Firebase app (might be in use)', error);
        }
      }
    }

    // Create fresh Firebase app
    const firebaseApp = initializeApp(webConfig);
    if (onAppCreated) {
      onAppCreated(firebaseApp);
    }
    const rc = getWebRC(firebaseApp);

    logger.debug('Web Remote Config initialized', {
      projectId: webConfig.projectId,
      appId: webConfig.appId,
    });

    // Set minimum fetch interval
    rc.settings.minimumFetchIntervalMillis = MIN_FETCH_INTERVAL_MS;

    // Wrapper to normalize web API to match native API
    const wrapper: RemoteConfigModule = {
      setConfigSettings: async (settings) => {
        rc.settings.minimumFetchIntervalMillis = settings.minimumFetchIntervalMillis;
      },
      setDefaults: async (defaults) => {
        // Web SDK expects Record<string, string | number | boolean>
        // Convert complex objects to JSON strings
        const webDefaults: Record<string, string | number | boolean> = {};
        for (const [key, value] of Object.entries(defaults)) {
          if (typeof value === 'object' && value !== null) {
            webDefaults[key] = JSON.stringify(value);
          } else {
            webDefaults[key] = value as string | number | boolean;
          }
        }
        rc.defaultConfig = webDefaults;
      },
      fetchAndActivate: () => webFetchAndActivate(rc),
      activate: () => webActivate(rc),
      getValue: (key: string) => {
        const value = webGetValue(rc, key);
        return {
          asBoolean: () => value.asBoolean(),
          asNumber: () => value.asNumber(),
          asString: () => value.asString(),
          getSource: () => value.getSource() as 'default' | 'remote' | 'static',
        };
      },
      // Web SDK doesn't support real-time updates, so this is optional
      onConfigUpdated: undefined,
    };

    return wrapper;
  } catch (error) {
    logger.warn('Web Remote Config initialization failed', error);
    return null;
  }
}

function parseRemoteValue<T extends FeatureFlagValue>(
  key: FeatureFlagKey,
  fallback: T,
  remoteConfig: RemoteConfigModule | null,
): T {
  if (!remoteConfig) {
    return fallback;
  }

  const value = remoteConfig.getValue(key);
  if (typeof fallback === 'boolean') {
    return value.asBoolean() as T;
  }
  if (typeof fallback === 'number') {
    return value.asNumber() as T;
  }
  if (typeof fallback === 'string') {
    return value.asString() as T;
  }

  const raw = value.asString();
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function createFirebaseProvider(): FeatureFlagClient {
  let status: FeatureFlagStatus = 'loading';
  let remoteConfig: RemoteConfigModule | null = null;
  let lastFetchTimestamp = 0;
  let isDestroyed = false;
  let didLogContext = false;
  let realTimeUnsubscribe: (() => void) | null = null;
  let appStateSubscription: { remove?: () => void } | null = null;
  const listeners = new Set<(key?: FeatureFlagKey) => void>();
  let readyPromise: Promise<void> | null = null;
  let lastUpdateTimestamp = 0;
  let isProcessingUpdate = false;
  let firebaseAppToCleanup: unknown | null = null; // Store app for cleanup on web

  const notifyListeners = (changedKeys?: FeatureFlagKey[]) => {
    if (isDestroyed) {
      return;
    }
    if (changedKeys && changedKeys.length > 0) {
      changedKeys.forEach((key) => {
        listeners.forEach((listener) => listener(key));
      });
      return;
    }
    listeners.forEach((listener) => listener());
  };

  const refresh = async (context: 'startup' | 'foreground' | 'manual') => {
    if (!remoteConfig || isDestroyed) {
      return;
    }

    const timeSinceLastFetch = Date.now() - lastFetchTimestamp;
    if (context === 'foreground' && timeSinceLastFetch < MIN_FOREGROUND_REFRESH_MS) {
      logger.debug('Skipping foreground refresh (too recent)');
      return;
    }

    try {
      logger.debug(`Starting fetch (context: ${context})`);
      const activated = await remoteConfig.fetchAndActivate();
      lastFetchTimestamp = Date.now();

      // Log all flag values after fetch to diagnose issue
      const flagStatus = Object.keys(DEFAULT_FLAGS).map((key) => {
        const value = remoteConfig!.getValue(key);
        return {
          key,
          value: value.asString(),
          source: value.getSource(),
        };
      });

      if (activated) {
        logger.info('Remote Config updated with new values', { flags: flagStatus });
        notifyListeners();
      } else {
        logger.info('Remote Config fetch completed, no new values', { flags: flagStatus });
      }
    } catch (error) {
      logger.warn('Foreground refresh failed, using cached/defaults', error);
    }
  };

  const initialize = async () => {
    logger.info('Initializing Firebase Remote Config', {
      platform: Platform.OS,
      defaults: DEFAULT_FLAGS,
    });
    remoteConfig =
      Platform.OS === 'web'
        ? getWebRemoteConfig((app) => {
            firebaseAppToCleanup = app;
          })
        : getNativeRemoteConfig();
    if (!remoteConfig) {
      status = 'ready';
      logger.warn('Remote Config module not available');
      notifyListeners(); // Notify hooks that we're ready (using defaults only)
      return;
    }

    try {
      await remoteConfig.setDefaults(DEFAULT_FLAGS);
      await remoteConfig.setConfigSettings({
        minimumFetchIntervalMillis: MIN_FETCH_INTERVAL_MS,
      });

      // Try to activate any previously cached values before fetching
      const cacheActivated = await remoteConfig.activate();
      logger.debug(`Cache activation result: ${cacheActivated}`);

      // Attempt to fetch fresh values (will use cache if offline)
      await refresh('startup');
      status = 'ready';
      logger.info('Remote Config initialized successfully');
      notifyListeners(); // Notify hooks that status is now 'ready' and values are available
    } catch (error) {
      status = 'ready';
      logger.warn('Remote Config init failed, using cached/defaults', error);
      notifyListeners(); // Notify hooks even on error (status is 'ready', using defaults)
    }
  };

  const setupRealtimeListener = () => {
    if (isDestroyed || !remoteConfig || realTimeUnsubscribe) {
      return;
    }

    if (typeof remoteConfig.onConfigUpdated !== 'function') {
      logger.warn('Real-time listener not available');
      return;
    }

    try {
      realTimeUnsubscribe = remoteConfig.onConfigUpdated(async (event) => {
        if (isDestroyed || !remoteConfig) {
          return;
        }

        // Dedupe: Prevent concurrent processing of updates
        if (isProcessingUpdate) {
          logger.debug('Ignoring concurrent real-time update');
          return;
        }

        // Also check time-based dedupe
        const now = Date.now();
        if (now - lastUpdateTimestamp < 500) {
          logger.debug('Ignoring duplicate real-time update (too recent)');
          return;
        }

        isProcessingUpdate = true;
        lastUpdateTimestamp = now;

        logger.info('Real-time update received', { event });

        try {
          await remoteConfig.activate();
          lastFetchTimestamp = Date.now();
        } catch (error) {
          logger.warn('Failed to activate real-time update', error);
          isProcessingUpdate = false;
          return;
        }

        const updatedKeys = Array.isArray(event?.updatedKeys) ? event?.updatedKeys : [];
        const changedKeys = updatedKeys.filter(
          (key): key is FeatureFlagKey => key in DEFAULT_FLAGS,
        );

        if (changedKeys.length > 0) {
          // Log flag values and types
          const flagValues = changedKeys.map((key) => {
            const value = parseRemoteValue(key, DEFAULT_FLAGS[key], remoteConfig);
            return { key, value, type: typeof value };
          });
          logger.info('Real-time update applied', { flags: flagValues });
          notifyListeners(changedKeys);
        } else {
          logger.info('Real-time update applied (no specific keys)');
          notifyListeners();
        }

        isProcessingUpdate = false;
      });
      logger.info('Real-time listener registered');
    } catch (error) {
      logger.warn('Real-time listener not available', error);
    }
  };

  const setupForegroundRefresh = () => {
    if (appStateSubscription || isDestroyed) {
      return;
    }

    appStateSubscription = AppState.addEventListener?.('change', (state) => {
      if (state !== 'active') {
        return;
      }
      setupRealtimeListener();
      refresh('foreground');
    });
  };

  const ensureReady = () => {
    if (!readyPromise) {
      readyPromise = (async () => {
        await initialize();
        setupRealtimeListener();
        setupForegroundRefresh();
      })();
    }
    return readyPromise;
  };

  return {
    ready: async () => {
      await ensureReady();
    },
    getStatus: () => status,
    getFlag: <T extends FeatureFlagValue>(key: FeatureFlagKey, fallback: T): T => {
      const defaultValue = DEFAULT_FLAGS[key] as T;
      const base = fallback ?? defaultValue;
      return parseRemoteValue(key, base, remoteConfig);
    },
    getSource: (key: FeatureFlagKey) => {
      if (!remoteConfig) {
        return 'default';
      }
      try {
        const value = remoteConfig.getValue(key);
        return value.getSource();
      } catch {
        return 'default';
      }
    },
    setContext: async (context) => {
      if (!didLogContext && context && Object.keys(context).length > 0) {
        didLogContext = true;
        logger.debug('Remote Config ignores user context (SDK has no per-user targeting).');
      }
    },
    refresh: async () => {
      await ensureReady();
      await refresh('manual');
    },
    subscribe: (listener: (key?: FeatureFlagKey) => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    destroy: () => {
      isDestroyed = true;
      realTimeUnsubscribe?.();
      appStateSubscription?.remove?.();
      listeners.clear();

      // Cleanup Firebase app on web
      if (Platform.OS === 'web' && firebaseAppToCleanup) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { deleteApp } = require('firebase/app') as typeof import('firebase/app');
          deleteApp(firebaseAppToCleanup as Parameters<typeof deleteApp>[0]);
          logger.debug('Firebase app cleaned up on destroy');
        } catch (error) {
          logger.debug('Could not delete Firebase app on destroy', error);
        }
      }
    },
  };
}
