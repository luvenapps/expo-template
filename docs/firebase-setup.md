# Firebase Setup

## 0. Toggle gating (EXPO_PUBLIC_TURN_ON_FIREBASE)

Firebase native config (plist/json + plugins) is gated by the `EXPO_PUBLIC_TURN_ON_FIREBASE` env var. It defaults to **disabled**. Set it to `true` in the relevant `.env` when you want Firebase wired and rebuild native apps:

```
EXPO_PUBLIC_TURN_ON_FIREBASE=true
```

Local: set in `.env.local` and rebuild (prebuild/run or EAS).  
CI/EAS: set as an env/secret before the build.

## 1. Create the project

1. Visit the [Firebase Console](https://console.firebase.google.com/), click **Add project**, and create a project (e.g., `better-habits`).
2. Enable **Google Analytics** and **Firebase In-App Messaging** for the project.

## 2. Register app targets

Inside the same Firebase project, register each platform:

### iOS

1. Click **Add app → iOS**.
2. Use the bundle identifier `com.luvenapps.betterhabits`.
3. Download the generated `GoogleService-Info.plist`.
4. Place the file at `credentials/GoogleService-Info.plist` (this path is gitignored and referenced by `app.json`).

### Android

1. Click **Add app → Android**.
2. Use the package name `com.luvenapps.betterhabits`.
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

## 3. Keep credentials out of git

- The `credentials/` directory is part of the workspace but should remain in `.gitignore`.
- Expo’s config plugin (`@react-native-firebase/app`) reads from that directory during native builds.
- For CI/EAS builds, upload the plist/json files as “Build Credentials” or inject them through secure environment variables before build time.
- With gating: provide the files via secrets (base64 is easiest) and set `EXPO_PUBLIC_TURN_ON_FIREBASE=true` for build jobs that need Firebase; leave it unset/false for test-only jobs.

## 4. Verify locally

1. After dropping the plist/json, run `npm start` for Metro and `npm run ios` / `npm run android` to rebuild dev clients so the Firebase config is embedded.
2. Open the app (native + web) and trigger a few actions (e.g., toggles in Settings). In the Firebase Console → Analytics → DebugView you should see events like `notifications:reminders` and IAM lifecycle events (`iam:displayed`, `iam:clicked`, `iam:dismissed`) appear almost immediately.
3. For Android push: tap **Settings → Developer Utilities → Register push token (Android)** to log the FCM token in Metro, then in Firebase Console → Cloud Messaging use “Send test message” with that token (notification message). Foreground and background delivery should work; iOS/web push are deferred to Stage 11.

## 5. Next steps

- Keep Firebase credentials up to date whenever you rotate keys or add new environments. For web, ensure `.env.local` reflects the latest Expo config values.
- Revisit this doc whenever you rotate Firebase credentials or add additional apps/environments.
