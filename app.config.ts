// app.config.ts
import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  // Set APP_VARIANT=preview for Expo Go-friendly config (sdkVersion runtime)
  // Default is production (appVersion runtime)
  const variant = process.env.APP_VARIANT ?? 'production';
  const isPreview = variant === 'preview';

  const baseBundleId = '__APP_ID__';
  const baseAndroidPackage = '__APP_ID__';

  return {
    ...config,
    name: isPreview ? '__APP_NAME__ (Preview)' : '__APP_NAME__',
    slug: isPreview ? '__APP_SLUG__-preview' : '__APP_SLUG__',
    owner: 'luvenapps',

    version: '1.0.0',
    scheme: '__APP_NAME__',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,

    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },

    ios: {
      supportsTablet: true,
      bundleIdentifier: isPreview ? `${baseBundleId}.preview` : baseBundleId,
      buildNumber: '1',
      usesAppleSignIn: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        LSApplicationQueriesSchemes: ['itms-apps'],
      },
      appleTeamId: '',
      googleServicesFile: './credentials/GoogleService-Info.plist',
    },

    android: {
      versionCode: 1,
      softwareKeyboardLayoutMode: 'pan',
      permissions: ['POST_NOTIFICATIONS', 'POST_NOTIFICATIONS'],
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: isPreview ? `${baseAndroidPackage}.preview` : baseAndroidPackage,
      intentFilters: [
        {
          action: 'VIEW',
          category: ['BROWSABLE', 'DEFAULT'],
          data: [{ scheme: '__APP_NAME__' }],
        },
      ],
      googleServicesFile: './credentials/google-services.json',
    },

    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
      output: 'static',
    },

    plugins: [
      'expo-router',
      'expo-system-ui',
      'expo-sqlite',
      'expo-background-task',
      ['expo-notifications', { enableBackgroundRemoteNotifications: true }],
      'expo-localization',
      'expo-apple-authentication',
      'expo-web-browser',
      './plugins/withFirebaseCredentials.js',
      './plugins/withFirebaseConfig.js',
      './plugins/withFirebaseModularHeaders.js',
      'expo-secure-store',
    ],

    experiments: {
      typedRoutes: true,
    },

    extra: {
      router: {},
      storeIds: {
        ios: '',
        android: baseAndroidPackage,
      },
      // Optional: makes it easy to read in app code
      appVariant: variant,
    },

    runtimeVersion: isPreview
      ? { policy: 'sdkVersion' } // Expo Go-friendly
      : { policy: 'appVersion' }, // Production-friendly

    updates: {
      url: '',
    },
  };
};
