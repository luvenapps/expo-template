import { Linking, Platform } from 'react-native';

import { DOMAIN } from '@/config/domain.config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type Logger = {
  debug: (message: string, payload?: unknown) => void;
  info: (message: string, payload?: unknown) => void;
  warn: (message: string, payload?: unknown) => void;
  error: (message: string, error?: unknown) => void;
};

const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
const DEBUG_LOGS_STORAGE_KEY = `${DOMAIN.app.storageKey}-debug-logs-enabled`;
let debugLogsEnabled = false;
let debugLogsInitialized = false;

type DebugLogsSetter = (enabled: boolean) => void;

const toBoolean = (value: string | null) => {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return null;
};

const readStoredDebugFlag = () => {
  if (Platform.OS === 'web') {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
      return toBoolean(localStorage.getItem(DEBUG_LOGS_STORAGE_KEY));
    } catch {
      return null;
    }
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MMKV } = require('react-native-mmkv');
    const store = new MMKV({ id: 'debug-logs' });
    return toBoolean(store.getString(DEBUG_LOGS_STORAGE_KEY) ?? null);
  } catch {
    return null;
  }
};

const writeStoredDebugFlag = (enabled: boolean) => {
  if (Platform.OS === 'web') {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
      localStorage.setItem(DEBUG_LOGS_STORAGE_KEY, enabled ? 'true' : 'false');
    } catch {
      return;
    }
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MMKV } = require('react-native-mmkv');
    const store = new MMKV({ id: 'debug-logs' });
    store.set(DEBUG_LOGS_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    return;
  }
};

const parseDebugLogsUrl = (url: string, allowEnabledParam: boolean): boolean | null => {
  const lower = url.toLowerCase();
  if (!lower.includes('debug-logs')) return null;
  if (allowEnabledParam) {
    const enabledMatch = /[?&]enabled=([^&]+)/.exec(lower);
    if (enabledMatch) return toBoolean(enabledMatch[1]);
  }
  const debugMatch = /[?&]debug-logs=([^&]+)/.exec(lower);
  if (debugMatch) return toBoolean(debugMatch[1]);
  return null;
};

export const setDebugLogsEnabled: DebugLogsSetter = (enabled) => {
  debugLogsEnabled = enabled;
  writeStoredDebugFlag(enabled);
};

export const getDebugLogsEnabled = () => debugLogsEnabled;

const initDebugLogs = () => {
  if (debugLogsInitialized) return;
  debugLogsInitialized = true;
  debugLogsEnabled = readStoredDebugFlag() ?? false;

  const handleUrl = (url: string, allowEnabledParam: boolean) => {
    const parsed = parseDebugLogsUrl(url, allowEnabledParam);
    if (parsed === null) return;
    setDebugLogsEnabled(parsed);
  };

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      const href = typeof window.location?.href === 'string' ? window.location.href : '';
      if (href) {
        handleUrl(href, false);
      }
      if (typeof window.addEventListener === 'function') {
        window.addEventListener('storage', (event) => {
          if (event.key !== DEBUG_LOGS_STORAGE_KEY) return;
          const next = toBoolean(event.newValue);
          if (next === null) return;
          debugLogsEnabled = next;
        });
      }
    }
  } else {
    if (typeof Linking?.getInitialURL === 'function') {
      Linking.getInitialURL().then((url) => {
        if (url) handleUrl(url, true);
      });
    }
    if (typeof Linking?.addEventListener === 'function') {
      Linking.addEventListener('url', (event) => handleUrl(event.url, true));
    }
  }

  (globalThis as { __SET_DEBUG_LOGS__?: DebugLogsSetter }).__SET_DEBUG_LOGS__ = setDebugLogsEnabled;
};

function shouldLog(level: LogLevel) {
  if (isDev || debugLogsEnabled) return true;
  return level === 'warn' || level === 'error';
}

export function createLogger(namespace: string): Logger {
  initDebugLogs();
  // If you later forward logger output to analytics/crash reporting,
  // avoid sending analyticsCore logs to prevent feedback loops.
  const platformLabel =
    Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : Platform.OS;
  const platformPrefix = Platform.OS !== 'web' ? `[${platformLabel}] ` : '';
  const prefix = `${platformPrefix}[${namespace}]`;

  const log = (level: LogLevel, message: string, payload?: unknown) => {
    if (!shouldLog(level)) return;
    const output = `${prefix} ${message}`;
    switch (level) {
      case 'debug':
        console.log(output, payload ?? '');
        break;
      case 'info':
        console.info(output, payload ?? '');
        break;
      case 'warn':
        console.warn(output, payload ?? '');
        break;
      case 'error':
        console.error(output, payload ?? '');
        break;
      default:
        console.log(output, payload ?? '');
        break;
    }
  };

  return {
    debug: (message, payload) => log('debug', message, payload),
    info: (message, payload) => log('info', message, payload),
    warn: (message, payload) => log('warn', message, payload),
    error: (message, error) => log('error', message, error),
  };
}
