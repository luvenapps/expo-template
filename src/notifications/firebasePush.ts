import { DOMAIN } from '@/config/domain.config';
import { createLogger } from '@/observability/logger';
import { emitNotificationEvent } from '@/observability/notificationEvents';
import { WEB_NOTIFICATION_PERMISSION } from '@/notifications/status';
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
const logger = createLogger('FCM');
const webLogger = createLogger('FCM:web');
const webRegisterLogger = createLogger('FCM:web:register');

function getNativeStore() {
  try {
    const { createMMKV } = require('react-native-mmkv');
    return createMMKV({ id: `${DOMAIN.app.name}-notifications` });
  } catch {
    return null;
  }
}

// Load cached web token on module init (web only)
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  try {
    lastLoggedWebToken = localStorage.getItem(WEB_TOKEN_STORAGE_KEY);

    // If the current page session does not have permission, clear any cached token/state
    if (
      'Notification' in window &&
      Notification.permission !== WEB_NOTIFICATION_PERMISSION.GRANTED
    ) {
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
  logger.debug('registerForPushNotifications called');
  const turnOnFirebase =
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === 'true' ||
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === '1';
  if (!turnOnFirebase) {
    logger.debug('Firebase gated off');
    webLogger.warn('Firebase is gated off (EXPO_PUBLIC_TURN_ON_FIREBASE=false)');
    return { status: 'unavailable' };
  }

  if (Platform.OS === 'web') {
    return registerForWebPush();
  }

  // Native fast-path + in-flight dedupe
  logger.debug('lastLoggedNativeToken:', lastLoggedNativeToken ? 'exists' : 'null');
  if (lastLoggedNativeToken) {
    logger.debug('Fast-path: reusing cached token');
    return { status: 'registered', token: lastLoggedNativeToken };
  }
  if (nativeRegisterInFlight) {
    logger.debug('Registration already in-flight, reusing promise');
    return nativeRegisterInFlight;
  }

  nativeRegisterInFlight = (async () => {
    try {
      logger.debug('Loading @react-native-firebase/messaging...');
      const messagingModule = require('@react-native-firebase/messaging');
      const messaging = messagingModule.default;
      const AuthorizationStatus = messagingModule.AuthorizationStatus;
      const instance = messaging();
      logger.debug('Firebase messaging instance created');

      if (Platform.OS === 'ios') {
        try {
          logger.debug('iOS: Checking expo-notifications permission...');
          const Notifications = require('expo-notifications');
          const current = await Notifications.getPermissionsAsync();
          const granted =
            current.granted || current.status === Notifications.PermissionStatus.GRANTED;
          logger.debug('iOS: Permission result:', {
            granted,
            status: current.status,
            canAskAgain: current.canAskAgain,
          });

          if (!granted) {
            if (!current.canAskAgain) {
              logger.debug('iOS: Permission denied and cannot ask again');
              return { status: 'denied' };
            }

            logger.debug('iOS: Requesting permission...');
            const requested = await Notifications.requestPermissionsAsync();
            const requestedGranted =
              requested.granted || requested.status === Notifications.PermissionStatus.GRANTED;
            logger.debug('iOS: Request result:', {
              granted: requestedGranted,
              status: requested.status,
            });
            if (!requestedGranted) {
              return { status: 'denied' };
            }
          }
        } catch (permissionError) {
          logger.error('iOS: Permission check failed:', permissionError);
        }
      }

      // Ensure the device is registered for remote messages before requesting a token
      logger.debug('Registering device for remote messages...');
      if (instance.registerDeviceForRemoteMessages) {
        await instance.registerDeviceForRemoteMessages();
        logger.debug('Device registered for remote messages');
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
              logger.info('POST_NOTIFICATIONS permission denied');
              return { status: 'denied' };
            }
          } else {
            logger.info(`Skipping POST_NOTIFICATIONS permission (API ${apiLevel} < 33)`);
          }
        } catch (permError) {
          logger.warn('Error requesting POST_NOTIFICATIONS permission:', permError);
          // Continue anyway - permission might not exist on this Android version
        }
      }

      logger.debug('Requesting FCM permission...');
      const authStatus = await instance.requestPermission();
      logger.debug('FCM authStatus:', authStatus);
      const enabled =
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        logger.debug('FCM permission not enabled');
        return { status: 'denied' };
      }

      logger.debug('Getting FCM token...');
      const token = await instance.getToken();
      logger.debug('Token result:', token ? 'received' : 'null');
      if (token) {
        logger.info('✅ Token registered (copy this for your backend):', token);
        lastLoggedNativeToken = token;
        try {
          getNativeStore()?.set(NATIVE_TOKEN_STORAGE_KEY, token);
        } catch {
          // Ignore storage failures
        }
        return { status: 'registered', token };
      }
      logger.debug('No token received');
      return { status: 'error', message: 'No token' };
    } catch (error) {
      logger.error('Error:', error);
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
      logger.info('Foreground notification received:', remoteMessage);

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
          logger.warn('Failed to display foreground notification:', notifError);
        }
      }
    });

    // Handle token refresh (fires when token changes, including after app reinstall)
    const unsubscribeOnTokenRefresh = instance.onTokenRefresh((token: string) => {
      logger.info('Token refreshed:', token);
      logger.info(
        'Token was regenerated (app reinstall, token rotation, or first launch). Update this token in your backend.',
      );
    });

    logger.debug('Foreground message listener initialized');
    logger.debug('Token refresh listener initialized');

    return () => {
      unsubscribeForeground();
      unsubscribeOnTokenRefresh();
    };
  } catch (error) {
    logger.error('Failed to initialize FCM listeners:', error);
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
      logger.info('Background notification received:', remoteMessage);
      // Background notifications are automatically displayed by FCM
      // You can add custom logic here if needed (e.g., update local database)
    });

    logger.debug('Background message handler registered');
  } catch (error) {
    logger.error('Failed to setup background message handler:', error);
  }
}

/**
 * Set up foreground message listener for web
 * Must be called after Firebase app is initialized
 */
/* istanbul ignore next */
export function setupWebForegroundMessageListener() {
  if (Platform.OS !== 'web') {
    webLogger.debug('Not web platform, skipping foreground listener');
    return;
  }

  webForegroundListenerRegistrationCount += 1;
  if (webForegroundListenerRegistrationCount > 1) {
    webLogger.debug('Foreground listener already registered, skipping');
    return;
  }

  const turnOnFirebase =
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === 'true' ||
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === '1';
  if (!turnOnFirebase) {
    webLogger.info('Firebase not enabled, skipping foreground listener');
    return;
  }

  // Prevent double registration - onMessage handlers stack, causing duplicate notifications
  if (webForegroundListenerRegistered) {
    webLogger.debug('Foreground listener already registered, skipping');
    return;
  }

  // Mark as registered up front so repeated calls short-circuit even if initialization later fails.
  webForegroundListenerRegistered = true;

  webLogger.debug('Setting up foreground message listener...');

  try {
    // Lazy-load Firebase web messaging
    const { getApps } = require('firebase/app') as typeof import('firebase/app');
    const { getMessaging, onMessage } =
      require('firebase/messaging') as typeof import('firebase/messaging');

    const apps = getApps();
    webLogger.debug('Firebase apps count:', apps.length);

    if (apps.length === 0) {
      webLogger.debug(
        'No Firebase app initialized yet, skipping foreground listener (will retry on registration)',
      );
      return;
    }

    const messaging = getMessaging(apps[0]);
    webLogger.debug('Got messaging instance, registering onMessage handler');

    // Handle foreground messages
    // NOTE: onMessage fires for ALL messages when app is in foreground (both notification and data-only).
    // Firebase does NOT auto-display notifications in foreground - we must handle them manually.
    onMessage(messaging, (payload) => {
      webLogger.debug('🔔 Foreground message received');
      webLogger.debug('Payload:', JSON.stringify(payload, null, 2));

      // Extract notification content from either notification or data payload
      const title = payload.notification?.title || payload.data?.title || 'Better Habits';
      const body = payload.notification?.body || payload.data?.body || '';

      webLogger.debug('Displaying notification:', { title, body });

      // Always display in foreground (Firebase doesn't auto-display)
      if (
        'Notification' in window &&
        Notification.permission === WEB_NOTIFICATION_PERMISSION.GRANTED
      ) {
        try {
          const notification = new Notification(title, {
            body,
            icon: '/icon.png',
            badge: '/icon.png',
            data: payload.data || {},
            tag: payload.data?.tag || 'default',
          });

          const route =
            typeof payload.data?.route === 'string' && payload.data.route.length > 0
              ? payload.data.route
              : null;
          const eventPayload = {
            tag: payload.data?.tag || 'default',
            title,
            timestamp: new Date().toISOString(),
            platform: 'web' as const,
            route,
          };

          emitNotificationEvent({
            name: 'notification:foreground:displayed',
            payload: eventPayload,
          });

          let wasClicked = false;
          notification.onclick = () => {
            webLogger.debug('Notification clicked');
            wasClicked = true;
            emitNotificationEvent({
              name: 'notification:foreground:clicked',
              payload: eventPayload,
            });
            if (route) {
              window.location.assign(route);
            }
            notification.close();
          };

          notification.onclose = () => {
            if (wasClicked) return;
            emitNotificationEvent({
              name: 'notification:foreground:dismissed',
              payload: eventPayload,
            });
          };

          webLogger.debug('✅ Notification displayed successfully');
        } catch (error) {
          webLogger.error('❌ Error displaying notification:', error);
        }
      } else {
        webLogger.warn('⚠️  Cannot display notification - permission not granted');
      }
    });

    webForegroundListenerRegistered = true;
    webLogger.debug('✅ Foreground message listener successfully set up');
  } catch (error) {
    webLogger.error('❌ Failed to setup foreground message listener:', error);
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
              webLogger.info('Push subscription unsubscribed successfully');
            } else {
              webLogger.warn('Failed to unsubscribe from push subscription');
            }
          } else {
            webLogger.info('No active push subscription found');
          }
        } else {
          webLogger.info('No service worker registration found');
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
      webLogger.info('Service worker kept registered (new token will be generated on re-enable)');

      return { status: 'revoked' };
    } catch (error) {
      webLogger.error('Error revoking push token:', error);
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

  webRegisterLogger.debug('Starting');

  if (typeof window === 'undefined') {
    webRegisterLogger.warn('window is undefined, returning unavailable');
    return { status: 'unavailable' };
  }
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    webRegisterLogger.warn('Notification or serviceWorker not supported, returning unavailable');
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

  webRegisterLogger.debug('Config check:', {
    hasVapidKey: !!vapidKey,
    hasApiKey: !!webConfig.apiKey,
    hasAuthDomain: !!webConfig.authDomain,
    hasProjectId: !!webConfig.projectId,
  });

  if (!hasWebConfig(webConfig, vapidKey)) {
    webRegisterLogger.warn('Config incomplete, returning unavailable');
    return { status: 'unavailable' };
  }

  // If permission was revoked in the browser, drop any cached token so we fetch a fresh one
  if (Notification.permission !== WEB_NOTIFICATION_PERMISSION.GRANTED) {
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
  if (Notification.permission === WEB_NOTIFICATION_PERMISSION.GRANTED && lastLoggedWebToken) {
    try {
      const existingRegistration = await navigator.serviceWorker.getRegistration('/');
      const existingSubscription = await existingRegistration?.pushManager?.getSubscription?.();
      webRegisterLogger.debug('Fast-path status', {
        hasActive: Boolean(existingRegistration?.active),
        hasSubscription: Boolean(existingSubscription),
      });
      if (existingRegistration?.active && existingSubscription) {
        webRegisterLogger.debug('Reusing cached token and active service worker with subscription');
        return { status: 'registered', token: lastLoggedWebToken };
      }
    } catch (swCheckError) {
      webRegisterLogger.debug('Failed fast-path check, continuing:', swCheckError);
    }
  }

  webRegisterSessionPromise = (async () => {
    webRegisterLogger.debug('Checking Notification.permission:', Notification.permission);
    const permission =
      Notification.permission === WEB_NOTIFICATION_PERMISSION.GRANTED
        ? WEB_NOTIFICATION_PERMISSION.GRANTED
        : await Notification.requestPermission();

    webRegisterLogger.debug('Permission result:', permission);
    if (permission !== WEB_NOTIFICATION_PERMISSION.GRANTED) {
      // Clear cached token when the browser denies permission
      lastLoggedWebToken = null;
      try {
        localStorage.removeItem(WEB_TOKEN_STORAGE_KEY);
      } catch {
        // Ignore storage failures
      }
      webRegisterLogger.debug('Permission denied, returning denied');
      return { status: 'denied' };
    }

    try {
      webRegisterLogger.debug('Loading Firebase modules...');
      // Lazy-load Firebase web messaging
      const { initializeApp, getApps } = require('firebase/app') as typeof import('firebase/app');
      const { getMessaging, getToken, isSupported } =
        require('firebase/messaging') as typeof import('firebase/messaging');

      webRegisterLogger.debug('Checking Firebase messaging support...');
      if (!(await isSupported())) {
        webRegisterLogger.debug('Firebase messaging not supported, returning unavailable');
        return { status: 'unavailable' };
      }

      webRegisterLogger.debug('Initializing Firebase app...');
      const firebaseApp =
        getApps().length > 0 ? getApps()[0] : initializeApp(webConfig as Record<string, string>);
      webRegisterLogger.debug('Firebase app initialized');

      // Register Firebase messaging service worker
      webRegisterLogger.debug('Registering Firebase service worker...');
      let registration: ServiceWorkerRegistration | null = null;
      try {
        // First, check if there's already a registration
        const existingRegistration = await navigator.serviceWorker.getRegistration('/');

        if (existingRegistration) {
          webRegisterLogger.debug('Using existing service worker registration');
          registration = existingRegistration;
        } else {
          webRegisterLogger.debug('Registering new service worker...');
          registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            scope: '/',
          });
          webRegisterLogger.debug('Service worker registered:', registration.scope);
        }

        // Wait for the service worker to be ready and active
        await navigator.serviceWorker.ready;
        webRegisterLogger.debug('Service worker ready');

        // Ensure the service worker is active before proceeding
        const activeWorker = registration.active;
        if (activeWorker) {
          // Send Firebase config to the service worker
          activeWorker.postMessage({
            type: 'FIREBASE_CONFIG',
            config: webConfig,
          });
          webRegisterLogger.debug('Firebase config sent to service worker');

          // Give the service worker a moment to process the config
          await new Promise((resolve) => setTimeout(resolve, 100));
        } else if (registration.installing || registration.waiting) {
          webRegisterLogger.debug(
            'Service worker is installing/waiting, waiting for activation...',
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
        webRegisterLogger.error('Service worker registration failed:', swError);
        return { status: 'error', message: 'Service worker registration failed' };
      }

      if (!registration || !registration.active) {
        webRegisterLogger.debug('No active service worker available');
        return { status: 'error', message: 'No active service worker available' };
      }

      webRegisterLogger.debug('Getting messaging instance...');
      const messaging = getMessaging(firebaseApp);
      webRegisterLogger.debug('Getting FCM token with registration:', {
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
        webLogger.info('Token registered:', token);

        // Set up foreground message listener after successful registration
        setupWebForegroundMessageListener();

        return { status: 'registered', token };
      }

      webRegisterLogger.debug('No token received');
      return { status: 'error', message: 'No token' };
    } catch (error) {
      webRegisterLogger.error('Error:', error);
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
      webLogger.info('Service worker missing, re-registering to restore push notifications');
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
        webLogger.debug('Service worker config refreshed');
      }
      return null;
    }

    // Service worker exists, ensure it has the Firebase config
    return null;
  } catch (error) {
    webLogger.debug('Error checking service worker:', error);
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
