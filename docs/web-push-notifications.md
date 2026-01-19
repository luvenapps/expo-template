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

### Debug logging (service worker)

Service worker logs are gated by hostname and can be toggled at runtime.

**Enable logs from the page console:**

```js
navigator.serviceWorker?.ready.then((reg) => {
  reg.active?.postMessage({ type: 'SET_SW_DEBUG', value: true });
});
```

**Disable logs:**

```js
navigator.serviceWorker?.ready.then((reg) => {
  reg.active?.postMessage({ type: 'SET_SW_DEBUG', value: false });
});
```

Logs appear in dev console.

## Troubleshooting

### Important: Token Behavior on Web

**Push Subscription Management** (v3 implementation):

- FCM tokens are **managed by Firebase in IndexedDB** (not manually stored)
- When you toggle push OFF, the **push subscription is unsubscribed** but the **service worker stays registered**
- This properly removes push permissions via browser's Push API: `subscription.unsubscribe()`
- **Token behavior**: A **new token is generated each time** you re-enable push notifications
  - When `unsubscribe()` removes the push subscription, Firebase cannot reuse the old token
  - The old token remains in IndexedDB temporarily but becomes stale
  - Your backend must handle token updates when users re-enable push

**Why keep the service worker registered?**

- Browser's push subscription can be cleanly removed via `unsubscribe()` (follows web standards)
- Service worker remains available for re-registration without rebuild
- Reduces unnecessary service worker teardown/rebuild cycles
- Simpler architecture (separate concerns: push subscription vs service worker lifecycle)

### Native FCM Token Behavior (iOS/Android)

**Automatic Token Management**:

- React Native Firebase automatically caches FCM tokens on the device
- No manual storage needed - Firebase SDK handles persistence natively
- Tokens persist across app restarts automatically
- Firebase manages token lifecycle, rotation, and refreshing

**Token Lifecycle**:

- Tokens should be cycled on user logout/login for security
- Firebase automatically handles token refresh when needed
- Use `messaging().deleteToken()` to invalidate tokens on sign out
- New token automatically generated on next `getToken()` call

**Token Refresh Events**:

- The app registers an `onTokenRefresh` listener that logs whenever a new token is generated
- This fires in scenarios like:
  - **App reinstall** - Most common scenario, old token is invalidated
  - **Token rotation** - Firebase periodically rotates tokens for security
  - **First app launch** - Initial token generation
- When the listener fires, check your logs for: `[FCM] Token refreshed: <new-token>`
- You'll also see: `[FCM] Token was regenerated (app reinstall, token rotation, or first launch). Update this token in your backend.`

**Best Practice**: Let React Native Firebase manage token storage completely. Don't manually persist tokens in MMKV or AsyncStorage. Monitor the token refresh listener logs to capture new tokens for your backend.

---

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

### Issue: Service worker missing but push toggle still enabled

**This is handled automatically with service worker recovery** (v2 implementation)

If the service worker is unregistered (manually or by browser cleanup) but the push toggle shows as enabled:

1. On app load, the system checks if a service worker exists
2. If missing, it automatically re-registers the service worker
3. A new token is generated (the browser's push subscription was removed with the service worker)
4. The new token is logged to console with a warning
5. Push notifications resume working, but you'll need to update the token in your backend

**Why a new token?**

When a service worker is completely unregistered, the browser removes the associated push subscription. Firebase `getToken()` only reuses tokens when:

- The service worker registration exists AND
- The browser still has an active push subscription

**V2 Improvement**: By keeping the service worker registered when toggling push OFF (instead of unregistering it), we avoid this issue during normal usage. New tokens are now only generated when:

- Service worker is manually unregistered in DevTools
- Browser cleans up service workers (rare)
- First-time push enablement

**What to do:**

If you see the warning in console about a new token:

1. Copy the new token from the browser console
2. Update it in your backend/database
3. Or: Toggle push OFF then ON in Settings to trigger the update flow

**Preventing this:**

Avoid manually unregistering the service worker in DevTools unless you're debugging. With the v2 implementation, toggling push OFF/ON in Settings will NOT unregister the service worker, so you won't see new token generation.

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
- **Behavior** (v3 implementation):
  - **ON**: Requests permission, registers service worker (if needed), gets FCM token
    - If service worker already exists, reuses it and may reuse existing token from IndexedDB
    - Token is managed by Firebase SDK in IndexedDB (not manually stored)
  - **OFF**: Unsubscribes from push subscription but **keeps service worker registered**
    - Uses browser Push API: `subscription.unsubscribe()`
    - Notifications stop immediately (no active push subscription)
    - Firebase token remains in IndexedDB for potential reuse
  - Foreground listener sets up on component mount (idempotent, safe to call multiple times)

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

### Automatic Service Worker Recovery

**Problem**: Service workers can be unregistered (manually or by browser cleanup), causing push notifications to stop working even though the toggle shows "enabled".

**Solution**: On app mount, if push is enabled, we check if the service worker exists:

1. **Service worker exists**: Send Firebase config to ensure it's initialized
2. **Service worker missing**: Automatically re-register it by calling `registerForWebPush()`

**Important caveat**: When a service worker is completely unregistered, the browser also removes the associated push subscription. This means:

- A **NEW token is generated** (the old push subscription no longer exists)
- The new token is logged to console with a warning
- You'll need to update the token in your backend to continue sending notifications

**Why can't we reuse the old token?**

Firebase can only reuse tokens when BOTH of these are true:

1. The service worker registration exists
2. The browser still has an active push subscription

When you unregister the service worker (e.g., via DevTools), the browser removes the push subscription, so Firebase has no choice but to create a new one.

**Implementation**: `ensureServiceWorkerRegistered()` is called in `useNotificationSettings` hook when `pushOptInStatus === 'enabled'`. If a new token is generated, a warning is logged to console with the new token value.

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
