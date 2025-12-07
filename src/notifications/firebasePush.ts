import { Platform } from 'react-native';

export type PushRegistrationResult =
  | { status: 'registered'; token: string }
  | { status: 'unavailable' }
  | { status: 'denied' }
  | { status: 'error'; message: string };

export type PushRevokeResult =
  | { status: 'revoked' }
  | { status: 'unavailable' }
  | { status: 'error'; message: string };

export async function registerForPushNotifications(): Promise<PushRegistrationResult> {
  const turnOnFirebase =
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === 'true' ||
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === '1';
  if (!turnOnFirebase) {
    return { status: 'unavailable' };
  }

  if (Platform.OS === 'web') {
    return registerForWebPush();
  }

  try {
    const messagingModule = require('@react-native-firebase/messaging');
    const messaging = messagingModule.default;
    const AuthorizationStatus = messagingModule.AuthorizationStatus;
    const instance = messaging();

    // Ensure the device is registered for remote messages before requesting a token
    if (instance.registerDeviceForRemoteMessages) {
      await instance.registerDeviceForRemoteMessages();
    }

    // For Android 13+, we need to request POST_NOTIFICATIONS permission first
    if (Platform.OS === 'android') {
      try {
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
    if (token) {
      console.log('[FCM] Token registered:', token);
      return { status: 'registered', token };
    }
    return { status: 'error', message: 'No token' };
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
    const messagingModule = require('@react-native-firebase/messaging');
    const messaging = messagingModule.default;
    const instance = messaging();

    // Handle foreground notifications
    const unsubscribeForeground = instance.onMessage(async (remoteMessage: any) => {
      console.info('[FCM] Foreground notification received:', remoteMessage);

      // Display notification using expo-notifications or react-native-notifications
      if (remoteMessage.notification) {
        const { title, body } = remoteMessage.notification;

        // Use Expo Notifications to display the notification
        try {
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

    console.debug('[FCM] Foreground message listener initialized');

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
    const messagingModule = require('@react-native-firebase/messaging');
    const messaging = messagingModule.default;

    messaging().setBackgroundMessageHandler(async (remoteMessage: any) => {
      console.info('[FCM] Background notification received:', remoteMessage);
      // Background notifications are automatically displayed by FCM
      // You can add custom logic here if needed (e.g., update local database)
    });

    console.debug('[FCM] Background message handler registered');
  } catch (error) {
    console.error('[FCM] Failed to setup background message handler:', error);
  }
}

/**
 * Set up foreground message listener for web
 * Must be called after Firebase app is initialized
 */
/* istanbul ignore next */
export function setupWebForegroundMessageListener() {
  if (Platform.OS !== 'web') {
    console.debug('[FCM:web] Not web platform, skipping foreground listener');
    return;
  }

  const turnOnFirebase =
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === 'true' ||
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === '1';
  if (!turnOnFirebase) {
    console.info('[FCM:web] Firebase not enabled, skipping foreground listener');
    return;
  }

  console.debug('[FCM:web] Setting up foreground message listener...');

  try {
    // Lazy-load Firebase web messaging
    const { getApps } = require('firebase/app') as typeof import('firebase/app');
    const { getMessaging, onMessage } =
      require('firebase/messaging') as typeof import('firebase/messaging');

    const apps = getApps();
    console.debug('[FCM:web] Firebase apps count:', apps.length);

    if (apps.length === 0) {
      console.debug(
        '[FCM:web] No Firebase app initialized yet, skipping foreground listener (will retry on registration)',
      );
      return;
    }

    const messaging = getMessaging(apps[0]);
    console.debug('[FCM:web] Got messaging instance, registering onMessage handler');

    // Handle foreground messages
    onMessage(messaging, (payload) => {
      console.debug('[FCM:web] 🔔 Foreground message received!');
      console.debug('[FCM:web] Full payload:', JSON.stringify(payload, null, 2));

      // Display notification even when app is in foreground
      // Handle both notification and data-only messages
      const notificationData = payload.notification || payload.data;

      if (notificationData) {
        const title = payload.notification?.title || payload.data?.title || 'Better Habits';
        const body = payload.notification?.body || payload.data?.body || '';

        console.debug('[FCM:web] Attempting to display notification:', { title, body });

        // Use the Notification API to show the notification
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            const notification = new Notification(title, {
              body,
              icon: '/icon.png',
              badge: '/icon.png',
              data: payload.data || {},
              tag: payload.data?.tag || 'default',
            });

            // Handle notification click
            notification.onclick = () => {
              console.debug('[FCM:web] Notification clicked');
              window.focus();
              notification.close();
            };

            console.debug('[FCM:web] ✅ Foreground notification displayed successfully');
          } catch (error) {
            console.error('[FCM:web] ❌ Error displaying notification:', error);
          }
        } else {
          console.warn(
            '[FCM:web] ⚠️  Notification permission not granted or Notification API not available',
          );
          console.warn(
            '[FCM:web] Notification.permission:',
            typeof Notification !== 'undefined' ? Notification.permission : 'undefined',
          );
        }
      } else {
        console.warn('[FCM:web] ⚠️  No notification data in payload:', payload);
      }
    });

    console.debug('[FCM:web] ✅ Foreground message listener successfully set up');
  } catch (error) {
    console.error('[FCM:web] ❌ Failed to setup foreground message listener:', error);
  }
}

export async function revokePushToken(): Promise<PushRevokeResult> {
  const turnOnFirebase =
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === 'true' ||
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === '1';
  if (!turnOnFirebase || Platform.OS === 'web') {
    return { status: 'unavailable' };
  }

  try {
    const messagingModule = require('@react-native-firebase/messaging');
    const messaging = messagingModule.default;
    const instance = messaging();
    await instance.deleteToken();
    return { status: 'revoked' };
  } catch (error) {
    return { status: 'error', message: (error as Error).message };
  }
}

type WebMessagingConfig = {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
};

function hasWebConfig(config: WebMessagingConfig, vapidKey?: string) {
  return Boolean(
    vapidKey &&
      config.apiKey &&
      config.authDomain &&
      config.projectId &&
      config.storageBucket &&
      config.messagingSenderId &&
      config.appId,
  );
}

async function registerForWebPush(): Promise<PushRegistrationResult> {
  console.debug('[registerForWebPush] Starting');

  if (typeof window === 'undefined') {
    console.debug('[registerForWebPush] window is undefined, returning unavailable');
    return { status: 'unavailable' };
  }
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    console.debug(
      '[registerForWebPush] Notification or serviceWorker not supported, returning unavailable',
    );
    return { status: 'unavailable' };
  }

  const vapidKey = process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY;
  const webConfig: WebMessagingConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  };

  console.debug('[registerForWebPush] Config check:', {
    hasVapidKey: !!vapidKey,
    hasApiKey: !!webConfig.apiKey,
    hasAuthDomain: !!webConfig.authDomain,
    hasProjectId: !!webConfig.projectId,
  });

  if (!hasWebConfig(webConfig, vapidKey)) {
    console.debug('[registerForWebPush] Config incomplete, returning unavailable');
    return { status: 'unavailable' };
  }

  console.debug('[registerForWebPush] Checking Notification.permission:', Notification.permission);
  const permission =
    Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();

  console.debug('[registerForWebPush] Permission result:', permission);
  if (permission !== 'granted') {
    console.debug('[registerForWebPush] Permission denied, returning denied');
    return { status: 'denied' };
  }

  try {
    console.debug('[registerForWebPush] Loading Firebase modules...');
    // Lazy-load Firebase web messaging
    const { initializeApp, getApps } = require('firebase/app') as typeof import('firebase/app');
    const { getMessaging, getToken, isSupported } =
      require('firebase/messaging') as typeof import('firebase/messaging');

    console.debug('[registerForWebPush] Checking Firebase messaging support...');
    if (!(await isSupported())) {
      console.debug('[registerForWebPush] Firebase messaging not supported, returning unavailable');
      return { status: 'unavailable' };
    }

    console.debug('[registerForWebPush] Initializing Firebase app...');
    const firebaseApp =
      getApps().length > 0 ? getApps()[0] : initializeApp(webConfig as Record<string, string>);
    console.debug('[registerForWebPush] Firebase app initialized');

    // Register Firebase messaging service worker
    console.debug('[registerForWebPush] Registering Firebase service worker...');
    let registration: ServiceWorkerRegistration | null = null;
    try {
      // First, check if there's already a registration
      const existingRegistration = await navigator.serviceWorker.getRegistration('/');

      if (existingRegistration) {
        console.debug('[registerForWebPush] Using existing service worker registration');
        registration = existingRegistration;
      } else {
        console.debug('[registerForWebPush] Registering new service worker...');
        registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/',
        });
        console.debug('[registerForWebPush] Service worker registered:', registration.scope);
      }

      // Wait for the service worker to be ready and active
      await navigator.serviceWorker.ready;
      console.debug('[registerForWebPush] Service worker ready');

      // Ensure the service worker is active before proceeding
      const activeWorker = registration.active;
      if (activeWorker) {
        // Send Firebase config to the service worker
        activeWorker.postMessage({
          type: 'FIREBASE_CONFIG',
          config: webConfig,
        });
        console.debug('[registerForWebPush] Firebase config sent to service worker');

        // Give the service worker a moment to process the config
        await new Promise((resolve) => setTimeout(resolve, 100));
      } else if (registration.installing || registration.waiting) {
        console.debug(
          '[registerForWebPush] Service worker is installing/waiting, waiting for activation...',
        );
        // Wait for the service worker to become active
        await new Promise<void>((resolve) => {
          const checkState = () => {
            if (registration?.active) {
              resolve();
            } else {
              setTimeout(checkState, 50);
            }
          };
          checkState();
        });

        const newActiveWorker = registration.active;
        if (newActiveWorker) {
          newActiveWorker.postMessage({
            type: 'FIREBASE_CONFIG',
            config: webConfig,
          });
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
    } catch (swError) {
      console.error('[registerForWebPush] Service worker registration failed:', swError);
      return { status: 'error', message: 'Service worker registration failed' };
    }

    if (!registration || !registration.active) {
      console.debug('[registerForWebPush] No active service worker available');
      return { status: 'error', message: 'No active service worker available' };
    }

    console.debug('[registerForWebPush] Getting messaging instance...');
    const messaging = getMessaging(firebaseApp);
    console.debug('[registerForWebPush] Getting FCM token with registration:', {
      scope: registration.scope,
      hasActive: !!registration.active,
      hasPushManager: !!(registration.active && 'pushManager' in registration.active),
    });
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      console.log('[FCM:web] Token registered:', token);

      // Set up foreground message listener after successful registration
      setupWebForegroundMessageListener();

      return { status: 'registered', token };
    }

    console.debug('[registerForWebPush] No token received');
    return { status: 'error', message: 'No token' };
  } catch (error) {
    console.error('[registerForWebPush] Error:', error);
    return { status: 'error', message: (error as Error).message };
  }
}

// Exposed for tests
export { registerForWebPush as __registerForWebPush };
