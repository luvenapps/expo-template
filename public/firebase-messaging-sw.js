// Firebase Cloud Messaging Service Worker
// This file handles background push notifications on web

// Give the service worker access to Firebase Messaging.
// Note: These imports use importScripts() since this is a service worker context
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase config will be received from the main thread
// We'll initialize Firebase when we receive it
let firebaseApp = null;
let messaging = null;
let isInitialized = false;

// Listen for messages from the main thread to initialize Firebase
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG' && !isInitialized) {
    const config = event.data.config;

    try {
      firebaseApp = firebase.initializeApp(config);
      messaging = firebase.messaging(firebaseApp);
      isInitialized = true;

      console.log('[FCM SW] Firebase initialized with config:', {
        projectId: config.projectId,
        messagingSenderId: config.messagingSenderId,
      });

      // Set up background message handler immediately after initialization
      // NOTE: This handler fires for messages when the app is in background.
      // Firebase SDK behavior:
      // - Messages with "notification" payload: Auto-displayed by Firebase (we skip them to prevent duplicates)
      // - Data-only messages: We must display manually (handled below)
      messaging.onBackgroundMessage(async (payload) => {
        console.log('[FCM SW] Background message received:', payload);
        console.log(
          '[FCM SW] Payload type:',
          payload.notification ? 'notification payload' : 'data-only',
        );

        // Skip notification payloads - Firebase SDK auto-displays them
        // This prevents duplicate notifications when using Firebase Console campaigns
        if (payload.notification) {
          console.log(
            '[FCM SW] Notification payload detected - Firebase will display automatically',
          );
          console.log('[FCM SW] Skipping manual display to prevent duplicates');
          return;
        }

        // Only display data-only messages manually
        try {
          console.log('[FCM SW] Data-only message - displaying manually');
          const notificationTitle = payload.data?.title || 'Better Habits';
          const notificationBody = payload.data?.body || '';

          const notificationOptions = {
            body: notificationBody,
            icon: '/icon.png',
            badge: '/icon.png',
            data: payload.data || {},
            tag: payload.data?.tag || 'default',
            requireInteraction: false,
          };

          console.log('[FCM SW] Attempting to display notification:', {
            title: notificationTitle,
            body: notificationBody,
          });

          await self.registration.showNotification(notificationTitle, notificationOptions);

          console.log('[FCM SW] ✅ Notification displayed successfully');
        } catch (error) {
          console.error('[FCM SW] ❌ Failed to display notification:', error);
          console.error('[FCM SW] Error details:', error.message, error.stack);
        }
      });

      console.log('[FCM SW] Background message handler registered');
    } catch (error) {
      console.error('[FCM SW] Failed to initialize Firebase:', error);
    }
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[FCM SW] Notification clicked:', event.notification);

  event.notification.close();

  const rawData = event.notification?.data || {};
  let nestedData = rawData?.FCM_MSG?.data || rawData?.data || rawData;
  if (typeof rawData?.FCM_MSG === 'string') {
    try {
      nestedData = JSON.parse(rawData.FCM_MSG);
    } catch (error) {
      console.warn('[FCM SW] Failed to parse FCM_MSG payload:', error);
    }
  }
  const route =
    (typeof nestedData?.route === 'string' && nestedData.route) ||
    (typeof nestedData?.data?.route === 'string' && nestedData.data.route) ||
    (typeof rawData?.route === 'string' && rawData.route) ||
    null;
  const payload = {
    route,
    notificationId:
      (typeof nestedData?.notificationId === 'string' && nestedData.notificationId) ||
      (typeof nestedData?.messageId === 'string' && nestedData.messageId) ||
      event.notification?.tag ||
      null,
    source: 'remote',
    platform: 'web',
  };
  const message = { type: 'NOTIFICATION_CLICKED', payload };

  // Open the app or focus existing window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          try {
            client.postMessage(message);
          } catch (error) {
            console.warn('[FCM SW] Failed to post click message to client:', error);
          }
          return client.focus();
        }
      }

      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow(payload.route || '/');
      }
    }),
  );
});

console.log('[FCM SW] Service worker loaded');
