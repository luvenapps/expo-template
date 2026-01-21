// Applies Firebase native config and plugins for native builds.

const { withPlugins } = require('@expo/config-plugins');

module.exports = function withFirebaseConfig(config) {
  const next = withPlugins(config, [
    [
      '@react-native-firebase/app',
      {
        ios: { googleServicesFile: './credentials/GoogleService-Info.plist' },
        android: { googleServicesFile: './credentials/google-services.json' },
      },
    ],
    '@react-native-firebase/crashlytics',
  ]);

  // Also set the googleServicesFile fields directly so Expo prebuild sees them.
  next.ios = next.ios || {};
  next.ios.googleServicesFile = './credentials/GoogleService-Info.plist';

  next.android = next.android || {};
  next.android.googleServicesFile = './credentials/google-services.json';

  return next;
};
