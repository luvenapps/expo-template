# Firebase Setup

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
3. Store these values in your `.env.local` (or `app.config.ts`) so we can initialize Firebase for Expo Web later (e.g., `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, etc.).

## 3. Keep credentials out of git

- The `credentials/` directory is part of the workspace but should remain in `.gitignore`.
- Expo’s config plugin (`@react-native-firebase/app`) reads from that directory during native builds.
- For CI/EAS builds, upload the plist/json files as “Build Credentials” or inject them through secure environment variables before build time.

## 4. Verify locally

1. After dropping the plist/json, run `npm start` for Metro and `npm run ios` / `npm run android` to rebuild dev clients so the Firebase config is embedded.
2. When Firebase Analytics and In-App Messaging are wired into the app, use Firebase DebugView to confirm events arrive.

## 5. Next steps

- Finish wiring the Firebase Analytics/In-App Messaging providers and Expo Push helpers.
- Update `.env.local` with the Expo web Firebase values before testing web analytics.
- Revisit this doc whenever you rotate Firebase credentials or add additional apps/environments.
