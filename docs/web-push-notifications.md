# Web Push Notifications with Firebase Cloud Messaging

## How Firebase Web Push Works

Firebase Cloud Messaging (FCM) on web has different behavior depending on:

1. Whether the app is in **foreground** or **background**
2. Whether the message has a **notification payload** or is **data-only**

### Message Types

#### 1. Notification Payload (has `notification` key)

```json
{
  "notification": {
    "title": "Your Title",
    "body": "Your Message"
  },
  "data": {
    "customKey": "customValue"
  }
}
```

**Behavior:**

- **Background**: Firebase SDK automatically displays the notification. `onBackgroundMessage` does NOT fire.
- **Foreground**: Firebase SDK does NOT display anything. You must handle it in `onMessage`.

#### 2. Data-Only Payload (no `notification` key)

```json
{
  "data": {
    "title": "Your Title",
    "body": "Your Message",
    "customKey": "customValue"
  }
}
```

**Behavior:**

- **Background**: `onBackgroundMessage` fires. You must call `self.registration.showNotification()`.
- **Foreground**: `onMessage` fires. You can display or process silently.

### Implementation Summary

| Message Type         | Foreground (`onMessage`)    | Background (`onBackgroundMessage`)              |
| -------------------- | --------------------------- | ----------------------------------------------- |
| Notification payload | Fires - we display manually | Does NOT fire - Firebase displays automatically |
| Data-only            | Fires - we display manually | Fires - we display manually                     |

## Avoiding Duplicate Notifications

**Common Issue**: Seeing **two notifications** for each message sent.

**Causes**:

1. **Listener registered multiple times**: If `onMessage` handler is set up twice, each notification triggers both handlers
2. **Using notification payload in background**: Firebase auto-displays + your manual display = duplicate

**Our Solution**:

1. **Idempotent listener registration**: `setupWebForegroundMessageListener()` can be called multiple times but only registers the handler once
2. **Use data-only payloads**: Recommended for full control over when/how notifications display
3. **Clear documentation**: Service worker comments explain when each handler fires

## Testing Web Push Notifications

### Method 1: Firebase Console (Recommended for production campaigns) ✅

Firebase Console always creates messages with a `notification` payload. Our service worker is production-ready and configured to handle this correctly:

- **Foreground**: 1 notification (displayed by our `onMessage` handler)
- **Background**: 1 notification (auto-displayed by Firebase SDK, our service worker skips it to prevent duplicates)

**Status**: Production-ready. No duplicate notifications.

**Steps**:

1. Go to Firebase Console → Cloud Messaging → Send test message
2. Add your FCM token (check browser console for `[FCM:web] Token registered: ...`)
3. Add notification title and body
4. Optionally add custom data in the "Additional options" section
5. Click "Test"

### Method 2: cURL (Full Control)

```bash
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=YOUR_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "FCM_TOKEN_HERE",
    "data": {
      "title": "Habit Reminder",
      "body": "Time to log your daily habits!",
      "tag": "habit-reminder"
    }
  }'
```

**Finding your server key**:

1. Firebase Console → Project Settings → Cloud Messaging
2. Copy the "Server key" (legacy API key)

**Finding your FCM token**:

- Check browser console after enabling push notifications
- Look for log: `[FCM:web] Token registered: eY...`

### Method 3: Postman/Insomnia

Same as cURL, but use a GUI:

- Method: POST
- URL: `https://fcm.googleapis.com/fcm/send`
- Headers:
  - `Authorization: key=YOUR_SERVER_KEY`
  - `Content-Type: application/json`
- Body (JSON):
  ```json
  {
    "to": "YOUR_FCM_TOKEN",
    "data": {
      "title": "Test Notification",
      "body": "This is a test message",
      "tag": "test"
    }
  }
  ```

## Testing Scenarios

### Test 1: Foreground Notification

1. Keep the Better Habits web app open and focused
2. Send a data-only message (see methods above)
3. **Expected**: See ONE notification displayed via `onMessage` handler

### Test 2: Background Notification

1. Keep the Better Habits web app open but switch to another tab
2. Send a data-only message
3. **Expected**: See ONE notification displayed via `onBackgroundMessage` (service worker)

### Test 3: Closed App

1. Close all Better Habits tabs
2. Send a data-only message
3. **Expected**: No notification (service worker only runs when app is open in background)
   - Note: True background push (app completely closed) requires persistent service worker setup

## Troubleshooting

### Issue: No notifications in foreground

**Check:**

- Browser console for `[FCM:web] ✅ Notification displayed successfully`
- Notification permission: `Notification.permission` should be `"granted"`
- `onMessage` handler is set up: Look for `[FCM:web] ✅ Foreground message listener successfully set up`

### Issue: Duplicate notifications

**Check:**

- You're using **data-only payloads** (no `notification` key)
- Listener only registers once: Look for single log `[FCM:web] Foreground listener already registered, skipping` if called multiple times
- Service worker console (DevTools → Application → Service Workers → Inspect) shows only one handler registration

### Issue: No notifications in background

**Check:**

- Service worker is registered: `navigator.serviceWorker.getRegistration('/')` in console
- Service worker logs: Chrome DevTools → Application → Service Workers → Inspect
- `onBackgroundMessage` handler is registered: Look for `[FCM SW] Background message handler registered`
- Using **data-only payload** (notification payloads are auto-displayed by Firebase, not by our handler)

### Issue: Service worker not updating

**Solution:**

1. Chrome DevTools → Application → Service Workers
2. Check "Update on reload"
3. Click "Unregister" for the existing worker
4. Reload the page
5. Re-enable notifications in Settings

### Issue: "Foreground listener already registered" on every page load

**This is normal and expected!** The idempotent check prevents duplicate registrations while allowing the setup function to be safely called multiple times.

## Current Implementation

### Files

- **Client**: `src/notifications/firebasePush.ts`
  - `registerForWebPush()`: Registers service worker and gets FCM token
  - `setupWebForegroundMessageListener()`: Sets up `onMessage` handler for foreground (idempotent)
  - `revokePushToken()`: Deletes FCM token and unregisters service worker

- **Service Worker**: `public/firebase-messaging-sw.js`
  - Receives Firebase config via `postMessage` from main thread
  - Sets up `onBackgroundMessage` handler for data-only messages
  - Handles notification clicks to focus/open the app

### Settings Integration

- **Location**: `app/(tabs)/settings/index.tsx`
- **UI**: Toggle switch under "Remote push notifications (web)"
- **Behavior**:
  - ON: Requests permission, registers service worker, gets FCM token
  - OFF: Deletes FCM token, unregisters service worker
  - Listener sets up on component mount (idempotent, safe to call multiple times)

## Architecture Decisions

### Why Idempotent Listener Registration?

**Problem**: The foreground listener setup was called in two places:

1. On Settings page mount (via `useNotificationSettings` hook)
2. After successful push registration (in `registerForWebPush()`)

This caused duplicate `onMessage` handlers, displaying each notification twice.

**Solution**: Added module-level flag `webForegroundListenerRegistered` to track registration state. The `setupWebForegroundMessageListener()` function:

- Returns early if already registered
- Only registers `onMessage` handler once
- Sets flag to true after successful registration

**Benefits**:

- Safe to call multiple times (idempotent)
- No duplicate notifications
- Listener works regardless of push toggle state (better UX)

### Why Keep Mount-Time Registration?

We could have removed the mount-time registration and only registered during push enablement, but we chose to keep it because:

- **Better UX**: Foreground notifications work even if user hasn't enabled push
- **Simpler logic**: No need to coordinate between toggle state and listener state
- **No downside**: Idempotent registration prevents duplicates

## Production Recommendations

### Using Firebase Console Campaigns ✅ CONFIGURED

Firebase Console campaigns are **fully supported** and configured correctly. The service worker automatically handles notification payloads to prevent duplicates.

**Current Behavior** (production-ready):

- ✅ **Foreground**: 1 notification (displayed by our `onMessage` handler)
- ✅ **Background**: 1 notification (auto-displayed by Firebase SDK)

**How It Works**:

Firebase Console always creates messages with a `notification` payload. Our service worker is configured to detect and skip these:

```javascript
// In public/firebase-messaging-sw.js (already implemented)
messaging.onBackgroundMessage((payload) => {
  // Skip notification payloads - Firebase SDK auto-displays them
  if (payload.notification) {
    console.log('[FCM SW] Notification payload - Firebase will display automatically');
    return; // ← This prevents duplicates
  }

  // Only display data-only messages manually
  const notificationTitle = payload.data?.title || 'Better Habits';
  // ... display notification
});
```

This ensures:

- **Firebase Console campaigns**: Firebase auto-displays → 1 notification ✅
- **Firebase Console test messages**: Firebase auto-displays → 1 notification ✅
- **Custom backend (data-only)**: We display → 1 notification ✅

### Using Custom Backend with Data-Only Messages

If you later add a custom backend for programmatic notifications, you can send data-only messages for full control:

```javascript
// Your backend (optional, for custom notifications)
await admin.messaging().send({
  token: userToken,
  data: {
    // No "notification" key
    title: 'Habit Reminder',
    body: 'Time to log your habits!',
  },
});
```

Data-only messages will be displayed by our service worker in background, and by our foreground handler when the app is open.

## References

- [Firebase Docs: Receive messages in a JavaScript client](https://firebase.google.com/docs/cloud-messaging/js/receive)
- [Firebase Docs: Message types](https://firebase.google.com/docs/cloud-messaging/concept-options#notifications_and_data_messages)
- [MDN: Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notification)
- [MDN: Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
