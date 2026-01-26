# Firebase Setup

## 0. Runtime toggle (EXPO_PUBLIC_TURN_ON_FIREBASE)

Firebase runtime behavior (analytics, crashlytics, performance, messaging) is controlled by `EXPO_PUBLIC_TURN_ON_FIREBASE`. It defaults to **disabled**. Set it to `true` in the relevant `.env` when you want Firebase events to flow:

```
EXPO_PUBLIC_TURN_ON_FIREBASE=true
```

Local: set in `.env.local` and restart Metro (rebuild native apps only if you changed native config).  
CI/EAS: set as an env/secret for the runtime behavior you want.

## 1. Create the project

1. Visit the [Firebase Console](https://console.firebase.google.com/), click **Add project**, and create a project.
2. Enable **Google Analytics** and **Firebase In-App Messaging** for the project.

## 2. Register app targets

Inside the same Firebase project, register each platform:

### iOS

1. Click **Add app → iOS**.
2. Use your bundle identifier.
3. Download the generated `GoogleService-Info.plist`.
4. Place the file at `credentials/GoogleService-Info.plist` (this path is gitignored and referenced by `app.json`).

### Android

1. Click **Add app → Android**.
2. Use the bundle identifier as the package name.
3. Download the generated `google-services.json`.
4. Place the file at `credentials/google-services.json`.

### Web

1. Click **Add app → Web**.
2. Copy the Firebase config snippet (apiKey, authDomain, projectId, etc.).
3. Store these values in `.env.local` so Expo Web can initialize Firebase:

   ```bash
   EXPO_PUBLIC_FIREBASE_API_KEY=...
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   EXPO_PUBLIC_FIREBASE_APP_ID=...
   EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=...
   ```

## 3. Keep credentials out of git (and provide them in CI/EAS)

- The `credentials/` directory is part of the workspace but should remain in `.gitignore`.
- Expo’s config plugin (`@react-native-firebase/app`) reads from that directory during native builds.
- For CI/EAS builds (including store deploys), provide the config files via secrets and decode them before the build:
  - `GOOGLE_SERVICE_INFO_PLIST_B64` — base64 of `credentials/GoogleService-Info.plist`
  - `GOOGLE_SERVICES_JSON_B64` — base64 of `credentials/google-services.json`
  - Decode them in your workflow (already wired) so native builds have the files.
- Native builds always require the credentials files (even if Firebase runtime is off).

## 4. Verify locally

1. After dropping the plist/json, run `npm start` for Metro and `npm run ios` / `npm run android` to rebuild dev clients so the Firebase config is embedded.
2. Open the app (native + web) and trigger a few actions (e.g., toggles in Settings). In the Firebase Console → Analytics → DebugView you should see events like `notifications:reminders` and IAM lifecycle events (`iam:displayed`, `iam:clicked`, `iam:dismissed`) appear almost immediately.
3. For Android push: tap **Settings → Developer Utilities → Register push token (Android)** to log the FCM token in Metro, then in Firebase Console → Cloud Messaging use “Send test message” with that token (notification message). Foreground and background delivery should work; iOS/web push are deferred to Stage 11.

## 5. Remote Config (Feature Flags)

Remote Config provides feature flags with real-time updates. It shares the same runtime toggle (`EXPO_PUBLIC_TURN_ON_FIREBASE`).

### Console Setup

1. In Firebase Console, go to **Remote Config** (under Build or Engage).
2. Click **Create configuration** if this is the first time.
3. Add parameters matching `DEFAULT_FLAGS` in `src/featureFlags/types.ts`:
   - `flag_example` → `false` (boolean)
   - `flag_new_ui` → `false` (boolean)
4. Click **Publish changes**.

### Adding New Flags

1. Add the flag to `DEFAULT_FLAGS` in `src/featureFlags/types.ts`:
   ```ts
   export const DEFAULT_FLAGS = {
     flag_example: false,
     flag_new_ui: false,
     flag_your_new_feature: false, // Add here
   } as const;
   ```
2. Add the same parameter in Firebase Console with a default value.
3. Use in code:

   ```ts
   import { useFeatureFlag } from '@/featureFlags/useFeatureFlag';

   const { value: enabled } = useFeatureFlag('flag_your_new_feature', false);
   ```

### Platform Support

| Platform | Implementation  | Real-time updates       |
| -------- | --------------- | ----------------------- |
| iOS      | RNFirebase SDK  | Yes                     |
| Android  | RNFirebase SDK  | Yes                     |
| Web      | Firebase JS SDK | No (poll on foreground) |

Web uses the Firebase JS SDK, which does not expose the real-time update listener. The app refreshes on foreground to pick up changes.

### Real-Time Updates

- iOS/Android receive push-based updates via `onConfigUpdated`, then call `activate()` to apply them.
- When the app returns to the foreground, it performs a guarded refresh to catch missed updates.
- Requires `@react-native-firebase/remote-config` >= 18.0.0 for real-time; older versions fall back to foreground refresh.

Flow:

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Firebase Console│────▶│ Firebase Backend │────▶│ App (foreground)│
│ Publish change  │     │ Push invalidation│     │ onConfigUpdated │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
                                                 ┌─────────────────┐
                                                 │ activate() +    │
                                                 │ notify listeners│
                                                 └─────────────────┘

```

#### Limitations

| Limitation                                                | Mitigation                                                      |
| --------------------------------------------------------- | --------------------------------------------------------------- |
| Foreground only                                           | AppState listener refreshes on foreground return (rate-limited) |
| 20M concurrent connections per project                    | Unlikely to hit for most apps                                   |
| Requires `@react-native-firebase/remote-config` >= 18.0.0 | Graceful fallback if unavailable                                |
| iOS intermittent fetch failures                           | Defaults/cached values used                                     |
| Web has no real-time listener                             | Foreground refresh to pick up changes                           |

### Caching and Fetch Intervals

- The SDK caches values on device (UserDefaults/SharedPreferences on native; IndexedDB/localStorage on web, depending on browser).
- Minimum fetch interval (`MIN_FETCH_INTERVAL_MS`) is 0 in dev and 60s in prod.
- Foreground refresh is rate-limited (`MIN_FOREGROUND_REFRESH_MS`) to avoid spamming fetches.

### Testing Locally

1. Ensure `EXPO_PUBLIC_TURN_ON_FIREBASE=true` in `.env.local`.
2. Run the app on iOS/Android simulator or Web.
3. Change a flag value in Firebase Console and publish.
4. Native: the app should reflect the change within a few seconds (check console logs for `[FeatureFlags] Real-time update`).
5. Web: reload or background/foreground the tab to pick up the new values.

For detailed implementation, see [docs/feature-flags.md](./feature-flags.md).

## 6. Next steps

- Keep Firebase credentials up to date whenever you rotate keys or add new environments. For web, ensure `.env.local` reflects the latest Expo config values.
- Revisit this doc whenever you rotate Firebase credentials or add additional apps/environments.
