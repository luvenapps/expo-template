import { Platform } from 'react-native';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type Logger = {
  debug: (message: string, payload?: unknown) => void;
  info: (message: string, payload?: unknown) => void;
  warn: (message: string, payload?: unknown) => void;
  error: (message: string, error?: unknown) => void;
};

const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
const enableDebugLogs =
  process.env.EXPO_PUBLIC_ENABLE_DEBUG_LOGS === 'true' ||
  process.env.EXPO_PUBLIC_ENABLE_DEBUG_LOGS === '1';

function shouldLog(level: LogLevel) {
  if (isDev || enableDebugLogs) return true;
  return level === 'warn' || level === 'error';
}

export function createLogger(namespace: string): Logger {
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
