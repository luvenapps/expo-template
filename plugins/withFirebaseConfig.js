// Conditionally applies Firebase native config and plugins based on EXPO_PUBLIC_TURN_ON_FIREBASE
// Defaults to disabled; set EXPO_PUBLIC_TURN_ON_FIREBASE=true to include Firebase.

const { withPlugins } = require('@expo/config-plugins');
// Load env files so TURN_ON_FIREBASE can come from .env/.env.local during config eval
try {
  const dotenv = require('dotenv');
  dotenv.config();
  dotenv.config({ path: '.env.local' });
} catch (_e) {
  // Optional; ignore if dotenv isn't available in the eval environment
}

const USE_FIREBASE_CONFIG =
  process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === 'true' ||
  process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === '1';

module.exports = function withFirebaseConfig(config) {
  if (!USE_FIREBASE_CONFIG) {
    return config;
  }

  const next = withPlugins(config, [
    [
      '@react-native-firebase/app',
      {
        ios: { googleServicesFile: './credentials/GoogleService-Info.plist' },
        android: { googleServicesFile: './credentials/google-services.json' },
      },
    ],
  ]);

  // Also set the googleServicesFile fields directly so Expo prebuild sees them.
  next.ios = next.ios || {};
  next.ios.googleServicesFile = './credentials/GoogleService-Info.plist';

  next.android = next.android || {};
  next.android.googleServicesFile = './credentials/google-services.json';

  return next;
};
