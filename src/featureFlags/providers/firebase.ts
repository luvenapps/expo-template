import { createLogger } from '@/observability/logger';
import { AppState } from 'react-native';
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

function getRemoteConfig(): RemoteConfigModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const remoteConfig = require('@react-native-firebase/remote-config').default;
    return remoteConfig();
  } catch (error) {
    logger.warn('Remote Config not available, using defaults', error);
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

    if (context === 'foreground' && Date.now() - lastFetchTimestamp < MIN_FOREGROUND_REFRESH_MS) {
      logger.debug('Skipping foreground refresh (too recent)');
      return;
    }

    try {
      const activated = await remoteConfig.fetchAndActivate();
      lastFetchTimestamp = Date.now();
      if (activated) {
        notifyListeners();
      }
    } catch (error) {
      logger.warn('Foreground refresh failed, using cached/defaults', error);
    }
  };

  const initialize = async () => {
    logger.info('Initializing Firebase Remote Config');
    remoteConfig = getRemoteConfig();
    if (!remoteConfig) {
      status = 'ready';
      logger.warn('Remote Config module not available');
      return;
    }

    try {
      await remoteConfig.setDefaults(DEFAULT_FLAGS);
      await remoteConfig.setConfigSettings({
        minimumFetchIntervalMillis: MIN_FETCH_INTERVAL_MS,
      });
      await refresh('startup');
      status = 'ready';
      logger.info('Remote Config initialized successfully');
    } catch (error) {
      status = 'ready';
      logger.warn('Remote Config init failed, using cached/defaults', error);
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
    },
  };
}
