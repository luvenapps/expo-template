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
      messaging.onBackgroundMessage((payload) => {
        console.log('[FCM SW] Background message received:', payload);

        const notificationTitle = payload.notification?.title || 'Better Habits';
        const notificationOptions = {
          body: payload.notification?.body || '',
          icon: payload.notification?.icon || '/icon.png',
          badge: '/icon.png',
          data: payload.data || {},
          tag: payload.data?.tag || 'default',
          requireInteraction: false,
        };

        return self.registration.showNotification(notificationTitle, notificationOptions);
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

  // Open the app or focus existing window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          return client.focus();
        }
      }

      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    }),
  );
});

console.log('[FCM SW] Service worker loaded');
