import { DOMAIN } from '@/config/domain.config';
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

// Module-level flag to prevent double listener registration on web
let webForegroundListenerRegistered = false;
let webForegroundListenerRegistrationCount = 0;
let webRegisterSessionPromise: Promise<PushRegistrationResult> | null = null;
let lastLoggedNativeToken: string | null = null;
let lastLoggedWebToken: string | null = null;
let nativeRegisterInFlight: Promise<PushRegistrationResult> | null = null;
const WEB_TOKEN_STORAGE_KEY = `${DOMAIN.app.name}-web-fcm-token`;
const NATIVE_TOKEN_STORAGE_KEY = `${DOMAIN.app.name}-native-fcm-token`;

function getNativeStore() {
  try {
    const { MMKV } = require('react-native-mmkv');
    return new MMKV({ id: `${DOMAIN.app.name}-notifications` });
  } catch {
    return null;
  }
}

// Load cached web token on module init (web only)
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  try {
    lastLoggedWebToken = localStorage.getItem(WEB_TOKEN_STORAGE_KEY);

    // If the current page session does not have permission, clear any cached token/state
    if ('Notification' in window && Notification.permission !== 'granted') {
      lastLoggedWebToken = null;
      localStorage.removeItem(WEB_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures
  }
}

// Load cached native token on module init (native only)
if (Platform.OS !== 'web') {
  try {
    const nativeStore = getNativeStore();
    const cachedToken = nativeStore?.getString(NATIVE_TOKEN_STORAGE_KEY) ?? null;
    if (cachedToken) {
      lastLoggedNativeToken = cachedToken;
    }
  } catch {
    // Ignore storage failures
  }
}

export async function registerForPushNotifications(): Promise<PushRegistrationResult> {
  const turnOnFirebase =
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === 'true' ||
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === '1';
  if (!turnOnFirebase) {
    console.warn('[FCM:web] Firebase is gated off (EXPO_PUBLIC_TURN_ON_FIREBASE=false)');
    return { status: 'unavailable' };
  }

  if (Platform.OS === 'web') {
    return registerForWebPush();
  }

  // Native fast-path + in-flight dedupe
  if (lastLoggedNativeToken) {
    return { status: 'registered', token: lastLoggedNativeToken };
  }
  if (nativeRegisterInFlight) {
    return nativeRegisterInFlight;
  }

  nativeRegisterInFlight = (async () => {
    try {
      const messagingModule = require('@react-native-firebase/messaging');
      const messaging = messagingModule.default;
      const AuthorizationStatus = messagingModule.AuthorizationStatus;
      const instance = messaging();

      if (Platform.OS === 'ios') {
        try {
          const Notifications = require('expo-notifications');
          const current = await Notifications.getPermissionsAsync();
          const granted =
            current.granted || current.status === Notifications.PermissionStatus.GRANTED;

          if (!granted) {
            if (!current.canAskAgain) {
              return { status: 'denied' };
            }

            const requested = await Notifications.requestPermissionsAsync();
            const requestedGranted =
              requested.granted || requested.status === Notifications.PermissionStatus.GRANTED;
            if (!requestedGranted) {
              return { status: 'denied' };
            }
          }
        } catch (permissionError) {
          console.warn('[FCM] iOS notification permission request failed:', permissionError);
        }
      }

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
        console.log('[FCM] ✅ Token registered (copy this for your backend):', token);
        lastLoggedNativeToken = token;
        try {
          getNativeStore()?.set(NATIVE_TOKEN_STORAGE_KEY, token);
        } catch {
          // Ignore storage failures
        }
        return { status: 'registered', token };
      }
      return { status: 'error', message: 'No token' };
    } catch (error) {
      return { status: 'error', message: (error as Error).message };
    } finally {
      nativeRegisterInFlight = null;
    }
  })();

  return nativeRegisterInFlight;
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

    // Handle token refresh (fires when token changes, including after app reinstall)
    const unsubscribeOnTokenRefresh = instance.onTokenRefresh((token: string) => {
      console.log('[FCM] Token refreshed:', token);
      console.info(
        '[FCM] Token was regenerated (app reinstall, token rotation, or first launch). Update this token in your backend.',
      );
    });

    console.debug('[FCM] Foreground message listener initialized');
    console.debug('[FCM] Token refresh listener initialized');

    return () => {
      unsubscribeForeground();
      unsubscribeOnTokenRefresh();
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

  webForegroundListenerRegistrationCount += 1;
  if (webForegroundListenerRegistrationCount > 1) {
    console.debug('[FCM:web] Foreground listener already registered, skipping');
    return;
  }

  const turnOnFirebase =
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === 'true' ||
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === '1';
  if (!turnOnFirebase) {
    console.info('[FCM:web] Firebase not enabled, skipping foreground listener');
    return;
  }

  // Prevent double registration - onMessage handlers stack, causing duplicate notifications
  if (webForegroundListenerRegistered) {
    console.debug('[FCM:web] Foreground listener already registered, skipping');
    return;
  }

  // Mark as registered up front so repeated calls short-circuit even if initialization later fails.
  webForegroundListenerRegistered = true;

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
    // NOTE: onMessage fires for ALL messages when app is in foreground (both notification and data-only).
    // Firebase does NOT auto-display notifications in foreground - we must handle them manually.
    onMessage(messaging, (payload) => {
      console.debug('[FCM:web] 🔔 Foreground message received');
      console.debug('[FCM:web] Payload:', JSON.stringify(payload, null, 2));

      // Extract notification content from either notification or data payload
      const title = payload.notification?.title || payload.data?.title || 'Better Habits';
      const body = payload.notification?.body || payload.data?.body || '';

      console.debug('[FCM:web] Displaying notification:', { title, body });

      // Always display in foreground (Firebase doesn't auto-display)
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          const notification = new Notification(title, {
            body,
            icon: '/icon.png',
            badge: '/icon.png',
            data: payload.data || {},
            tag: payload.data?.tag || 'default',
          });

          notification.onclick = () => {
            console.debug('[FCM:web] Notification clicked');
            window.focus();
            notification.close();
          };

          console.debug('[FCM:web] ✅ Notification displayed successfully');
        } catch (error) {
          console.error('[FCM:web] ❌ Error displaying notification:', error);
        }
      } else {
        console.warn('[FCM:web] ⚠️  Cannot display notification - permission not granted');
      }
    });

    webForegroundListenerRegistered = true;
    console.debug('[FCM:web] ✅ Foreground message listener successfully set up');
  } catch (error) {
    console.error('[FCM:web] ❌ Failed to setup foreground message listener:', error);
  }
}

export async function revokePushToken(): Promise<PushRevokeResult> {
  const turnOnFirebase =
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === 'true' ||
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === '1';
  if (!turnOnFirebase) {
    return { status: 'unavailable' };
  }

  // Web implementation: Unsubscribe from push subscription but KEEP service worker registered
  // This properly removes push permissions while allowing potential token reuse
  if (Platform.OS === 'web') {
    try {
      // Reset session promise so next enable will register anew
      webRegisterSessionPromise = null;

      // Use browser Push API to unsubscribe from push subscription
      // This properly removes the push subscription while keeping service worker registered
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration('/');

        if (registration) {
          const subscription = await registration.pushManager.getSubscription();

          if (subscription) {
            const unsubscribed = await subscription.unsubscribe();

            if (unsubscribed) {
              console.log('[FCM:web] Push subscription unsubscribed successfully');
            } else {
              console.warn('[FCM:web] Failed to unsubscribe from push subscription');
            }
          } else {
            console.log('[FCM:web] No active push subscription found');
          }
        } else {
          console.log('[FCM:web] No service worker registration found');
        }

        // Clear cached token so a fresh one is requested on re-enable
        lastLoggedWebToken = null;
        try {
          localStorage.removeItem(WEB_TOKEN_STORAGE_KEY);
        } catch {
          // Ignore storage failures
        }
      }

      // Service worker stays registered for efficient re-enablement
      // Note: Firebase cannot reuse the old token because the push subscription was removed.
      // A new token will be generated when push is re-enabled. The old token in IndexedDB
      // becomes stale. Backends must handle token updates when users re-enable push.
      console.log(
        '[FCM:web] Service worker kept registered (new token will be generated on re-enable)',
      );

      return { status: 'revoked' };
    } catch (error) {
      console.error('[FCM:web] Error revoking push token:', error);
      return { status: 'error', message: (error as Error).message };
    }
  }

  // Native implementation
  try {
    const messagingModule = require('@react-native-firebase/messaging');
    const messaging = messagingModule.default;
    const instance = messaging();
    await instance.deleteToken();
    lastLoggedNativeToken = null;
    try {
      getNativeStore()?.delete(NATIVE_TOKEN_STORAGE_KEY);
    } catch {
      // Ignore storage failures
    }
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
  // Deduplicate concurrent/rapid calls to avoid double token generation
  if (webRegisterSessionPromise) {
    return webRegisterSessionPromise;
  }

  console.debug('[registerForWebPush] Starting');

  if (typeof window === 'undefined') {
    console.warn('[registerForWebPush] window is undefined, returning unavailable');
    return { status: 'unavailable' };
  }
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    console.warn(
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
    console.warn('[registerForWebPush] Config incomplete, returning unavailable');
    return { status: 'unavailable' };
  }

  // If permission was revoked in the browser, drop any cached token so we fetch a fresh one
  if (Notification.permission !== 'granted') {
    lastLoggedWebToken = null;
    try {
      localStorage.removeItem(WEB_TOKEN_STORAGE_KEY);
    } catch {
      // Ignore storage failures
    }
    // Reset session promise when permission is not granted
    webRegisterSessionPromise = null;
  }

  // Fast-path: if permission is already granted, a service worker is active, and we have a
  // cached token, avoid re-registering and reuse the existing token.
  if (Notification.permission === 'granted' && lastLoggedWebToken) {
    try {
      const existingRegistration = await navigator.serviceWorker.getRegistration('/');
      const existingSubscription = await existingRegistration?.pushManager?.getSubscription?.();
      if (existingRegistration?.active && existingSubscription) {
        console.debug(
          '[registerForWebPush] Reusing cached token and active service worker with subscription',
        );
        return { status: 'registered', token: lastLoggedWebToken };
      }
    } catch (swCheckError) {
      console.debug('[registerForWebPush] Failed fast-path check, continuing:', swCheckError);
    }
  }

  webRegisterSessionPromise = (async () => {
    console.debug(
      '[registerForWebPush] Checking Notification.permission:',
      Notification.permission,
    );
    const permission =
      Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();

    console.debug('[registerForWebPush] Permission result:', permission);
    if (permission !== 'granted') {
      // Clear cached token when the browser denies permission
      lastLoggedWebToken = null;
      try {
        localStorage.removeItem(WEB_TOKEN_STORAGE_KEY);
      } catch {
        // Ignore storage failures
      }
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
        console.debug(
          '[registerForWebPush] Firebase messaging not supported, returning unavailable',
        );
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
        lastLoggedWebToken = token;
        try {
          localStorage.setItem(WEB_TOKEN_STORAGE_KEY, token);
        } catch {
          // Ignore storage failures
        }
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
  })();

  // Store session-scoped promise so subsequent calls in this load reuse it
  webRegisterSessionPromise
    .catch(() => {
      // Allow retry on failure/denial
      webRegisterSessionPromise = null;
    })
    .then((result) => {
      if (!result || result.status !== 'registered') {
        webRegisterSessionPromise = null;
      }
      return result;
    });

  return webRegisterSessionPromise;
}

/**
 * Check if service worker needs restoration and re-register if necessary.
 * This handles cases where the service worker was unregistered but push toggle is still enabled.
 * Called on app mount to ensure push notifications continue working.
 *
 * Note: Firebase getToken() automatically reuses existing tokens, so this won't generate
 * a new token unless the existing one is invalid.
 *
 * @returns Promise that resolves to registration result if re-registration was needed
 */
export async function ensureServiceWorkerRegistered(): Promise<PushRegistrationResult | null> {
  if (Platform.OS !== 'web') {
    return null;
  }

  const turnOnFirebase =
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === 'true' ||
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === '1';
  if (!turnOnFirebase) {
    return null;
  }

  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration('/');

    // If no service worker registration exists, re-register completely
    if (!registration) {
      console.info(
        '[FCM:web] Service worker missing, re-registering to restore push notifications',
      );
      // This will reuse the existing token if it's still valid
      return await registerForWebPush();
    }

    // If a registration exists, do not re-register; just refresh config
    if (registration.active) {
      const vapidKey = process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY;
      const webConfig = {
        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      };

      if (hasWebConfig(webConfig, vapidKey)) {
        registration.active.postMessage({
          type: 'FIREBASE_CONFIG',
          config: webConfig,
        });
        console.debug('[FCM:web] Service worker config refreshed');
      }
      return null;
    }

    // Service worker exists, ensure it has the Firebase config
    return null;
  } catch (error) {
    console.debug('[FCM:web] Error checking service worker:', error);
    return null;
  }
}

// Exposed for tests
export { registerForWebPush as __registerForWebPush };

// Test utility to clear web registration state
export function __resetWebPushStateForTests() {
  webRegisterSessionPromise = null;
  webForegroundListenerRegistered = false;
  webForegroundListenerRegistrationCount = 0;
}
