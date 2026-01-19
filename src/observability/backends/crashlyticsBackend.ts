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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crashlyticsModule = require('@react-native-firebase/crashlytics');
    if (!crashlyticsModule?.default) {
      logger.warn(
        'Native Crashlytics module not available. Rebuild the app after running: npx expo prebuild --clean',
      );
      return null;
    }

    const crashlytics = crashlyticsModule.default();

    return {
      recordError: (error, context) => {
        try {
          if (context) {
            Object.entries(context).forEach(([key, value]) => {
              crashlytics.setAttribute(key, String(value));
            });
          }
          crashlytics.recordError(error);
        } catch (err) {
          logger.error('Failed to record Crashlytics error:', err);
        }
      },
      setUserIdentifier: (userId) => {
        try {
          crashlytics.setUserId(userId);
        } catch (err) {
          logger.error('Failed to set Crashlytics user:', err);
        }
      },
      logBreadcrumb: (message, data) => {
        try {
          const suffix = data ? ` ${JSON.stringify(data)}` : '';
          crashlytics.log(`${message}${suffix}`);
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
