import { Platform } from 'react-native';
import { createLogger } from '@/observability/logger';
import type { ErrorReporterBackend } from './types';

const logger = createLogger('Crashlytics');

const turnOnFirebase =
  process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === 'true' ||
  process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === '1';

export function getCrashlyticsBackend(): ErrorReporterBackend | null {
  if (!turnOnFirebase || Platform.OS === 'web') {
    return null;
  }

  try {
    const crashlyticsModule =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@react-native-firebase/crashlytics') as typeof import('@react-native-firebase/crashlytics');
    if (typeof crashlyticsModule.getCrashlytics !== 'function') {
      logger.warn(
        'Native Crashlytics module not available. Rebuild the app after running: npx expo prebuild --clean',
      );
      return null;
    }
    const crashlytics = crashlyticsModule.getCrashlytics();

    return {
      recordError: (error, context) => {
        try {
          if (context) {
            Object.entries(context).forEach(([key, value]) => {
              void crashlyticsModule.setAttribute(crashlytics, key, String(value));
            });
          }
          crashlyticsModule.recordError(crashlytics, error);
        } catch (err) {
          logger.error('Failed to record Crashlytics error:', err);
        }
      },
      setUserIdentifier: (userId) => {
        try {
          void crashlyticsModule.setUserId(crashlytics, userId);
        } catch (err) {
          logger.error('Failed to set Crashlytics user:', err);
        }
      },
      logBreadcrumb: (message, data) => {
        try {
          const suffix = data ? ` ${JSON.stringify(data)}` : '';
          crashlyticsModule.log(crashlytics, `${message}${suffix}`);
        } catch (err) {
          logger.error('Failed to log Crashlytics breadcrumb:', err);
        }
      },
    };
  } catch {
    logger.warn(
      'Failed to initialize Crashlytics. You may need to rebuild: npx expo prebuild --clean',
    );
    return null;
  }
}
