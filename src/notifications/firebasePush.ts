import { Platform } from 'react-native';

export type PushRegistrationResult =
  | { status: 'registered'; token: string }
  | { status: 'unavailable' }
  | { status: 'denied' }
  | { status: 'error'; message: string };

export async function registerForPushNotifications(): Promise<PushRegistrationResult> {
  const turnOnFirebase =
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === 'true' ||
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === '1';
  if (!turnOnFirebase) {
    return { status: 'unavailable' };
  }

  if (Platform.OS === 'web') {
    return { status: 'unavailable' };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const messagingModule = require('@react-native-firebase/messaging');
    const messaging = messagingModule.default;
    const AuthorizationStatus = messagingModule.AuthorizationStatus;
    const instance = messaging();

    // For Android 13+, we need to request POST_NOTIFICATIONS permission first
    if (Platform.OS === 'android') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { PermissionsAndroid, Platform: RNPlatform } = require('react-native');

        // Only request POST_NOTIFICATIONS on Android 13+ (API level 33+)
        const apiLevel = RNPlatform.Version;
        if (apiLevel >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );

          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.log('[FCM] POST_NOTIFICATIONS permission denied');
            return { status: 'denied' };
          }
        } else {
          console.log(`[FCM] Skipping POST_NOTIFICATIONS permission (API ${apiLevel} < 33)`);
        }
      } catch (permError) {
        console.warn('[FCM] Error requesting POST_NOTIFICATIONS permission:', permError);
        // Continue anyway - permission might not exist on this Android version
      }
    }

    const authStatus = await instance.requestPermission();
    const enabled =
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      return { status: 'denied' };
    }

    const token = await instance.getToken();
    return token ? { status: 'registered', token } : { status: 'error', message: 'No token' };
  } catch (error) {
    return { status: 'error', message: (error as Error).message };
  }
}

/**
 * Initialize Firebase Cloud Messaging listeners
 * Must be called early in the app lifecycle
 */
export function initializeFCMListeners() {
  const turnOnFirebase =
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === 'true' ||
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === '1';
  if (!turnOnFirebase) return;

  if (Platform.OS === 'web') {
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const messagingModule = require('@react-native-firebase/messaging');
    const messaging = messagingModule.default;
    const instance = messaging();

    // Handle foreground notifications
    const unsubscribeForeground = instance.onMessage(async (remoteMessage: any) => {
      console.log('[FCM] Foreground notification received:', remoteMessage);

      // Display notification using expo-notifications or react-native-notifications
      if (remoteMessage.notification) {
        const { title, body } = remoteMessage.notification;

        // Use Expo Notifications to display the notification
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const Notifications = require('expo-notifications');
          await Notifications.scheduleNotificationAsync({
            content: {
              title: title || 'New Notification',
              body: body || '',
              data: remoteMessage.data || {},
            },
            trigger: null, // Show immediately
          });
        } catch (notifError) {
          console.warn('[FCM] Failed to display foreground notification:', notifError);
        }
      }
    });

    console.log('[FCM] Foreground message listener initialized');

    return () => {
      unsubscribeForeground();
    };
  } catch (error) {
    console.error('[FCM] Failed to initialize FCM listeners:', error);
  }
}

/**
 * Set up background message handler
 * MUST be called OUTSIDE of the React component lifecycle (at the top level)
 */
export function setupBackgroundMessageHandler() {
  const turnOnFirebase =
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === 'true' ||
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === '1';
  if (!turnOnFirebase) return;

  if (Platform.OS === 'web') {
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const messagingModule = require('@react-native-firebase/messaging');
    const messaging = messagingModule.default;

    messaging().setBackgroundMessageHandler(async (remoteMessage: any) => {
      console.log('[FCM] Background notification received:', remoteMessage);
      // Background notifications are automatically displayed by FCM
      // You can add custom logic here if needed (e.g., update local database)
    });

    console.log('[FCM] Background message handler registered');
  } catch (error) {
    console.error('[FCM] Failed to setup background message handler:', error);
  }
}

export async function savePushTokenToBackend(_token: string) {
  // TODO: implement Supabase persistence in Stage 11 (Android-only for now)
  return;
}

export async function sendTestPushViaFcm(_token: string, _payload: object) {
  // TODO: implement server-side FCM sender (Stage 11)
  return;
}

/* istanbul ignore next */
export function __resetFirebasePushForTests() {
  // Placeholder for future stateful refs
}
