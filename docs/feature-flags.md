# Feature Flags

This document explains how feature flags work in the app. For Firebase setup instructions, see [firebase-setup.md](./firebase-setup.md#5-remote-config-feature-flags).

## Overview

Feature flags allow toggling features remotely without app updates. The system uses:

- **Firebase Remote Config** for real-time flag delivery (when enabled)
- **Code defaults** as fallback (when Firebase is disabled or unavailable)
- **Provider-agnostic interface** to allow swapping implementations (e.g., LaunchDarkly)

## Architecture

```
src/featureFlags/
├── index.ts              # Entry point, provider selection, convenience exports
├── types.ts              # Interfaces, types, DEFAULT_FLAGS
├── useFeatureFlag.ts     # React hooks
└── providers/
    ├── firebase.ts       # Firebase Remote Config implementation
    └── fallback.ts       # Static defaults implementation
```

### Provider Selection

The system chooses a provider based on `EXPO_PUBLIC_TURN_ON_FIREBASE`:

| Environment Variable                 | Provider Used | Behavior                             |
| ------------------------------------ | ------------- | ------------------------------------ |
| `EXPO_PUBLIC_TURN_ON_FIREBASE=true`  | Firebase      | Real-time updates from Remote Config |
| `EXPO_PUBLIC_TURN_ON_FIREBASE=false` | Fallback      | Returns `DEFAULT_FLAGS` values       |

### Key Components

| Component                     | Purpose                                                  |
| ----------------------------- | -------------------------------------------------------- |
| `FeatureFlagClient` interface | Provider-agnostic contract for all implementations       |
| `DEFAULT_FLAGS` in `types.ts` | Source of truth for flag keys and default values         |
| `useFeatureFlag` hook         | React hook for consuming flags with automatic re-renders |
| `getFlag()` function          | Synchronous flag access for non-React code               |

## Real-Time Updates

When Firebase is enabled, the app receives flag changes instantly via `onConfigUpdated`.

### How It Works

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

1. You publish a flag change in Firebase Console
2. Firebase backend pushes an invalidation signal to connected apps
3. The SDK auto-fetches the new config
4. The app calls `activate()` to apply the new values
5. React components re-render with updated flag values

### Foreground/Background Behavior

- **Foreground**: Real-time listener is active; updates arrive within seconds
- **Background**: Listener pauses automatically (SDK behavior)
- **Return to foreground**: App refreshes flags to catch any changes missed while backgrounded

## Adding New Flags

1. **Add to `DEFAULT_FLAGS`** in [src/featureFlags/types.ts](../src/featureFlags/types.ts):
   - Key must be a valid identifier (e.g., `flag_your_feature`)
   - Value is the default when Firebase is unavailable

2. **Add to Firebase Console**:
   - Go to Remote Config → Add parameter
   - Use the same key name
   - Set the default value

3. **Use in code**:
   - React: `useFeatureFlag('flag_your_feature', false)`
   - Non-React: `getFlag('flag_your_feature', false)`

## Usage Patterns

### In React Components

Use the `useFeatureFlag` hook for automatic re-renders when flags change:

- Returns `{ value, status }` where status is `'loading' | 'ready' | 'error'`
- Show loading state while flags initialize
- Falls back to provided default if flag is missing

### Outside React

Use the `getFlag()` function for synchronous access:

- Returns the fallback value if flags aren't ready
- Suitable for services, utilities, and initialization code

### Waiting for Flags to Load

Use `useFeatureFlagsReady` hook when you need to block rendering until flags are available.

## Key Implementation Notes

| Concern                            | How It's Handled                                                           |
| ---------------------------------- | -------------------------------------------------------------------------- |
| **`onConfigUpdated` availability** | Wrapped in try-catch; falls back to foreground-only refresh if unavailable |
| **`activate()` required**          | Called explicitly after every real-time update event                       |
| **Foreground refresh rate limit**  | 1-minute minimum prevents throttling on rapid resume                       |
| **Listeners registered once**      | Guards prevent duplicate subscriptions                                     |
| **Cleanup**                        | `destroy()` removes all listeners when provider is no longer needed        |
| **iOS fetch errors (~10%)**        | Logged as warning, doesn't crash — foreground refresh is backup            |

## Limitations

| Limitation                                                | Mitigation                                                      |
| --------------------------------------------------------- | --------------------------------------------------------------- |
| Foreground only                                           | AppState listener refreshes on foreground return (rate-limited) |
| 20M concurrent connections per project                    | Unlikely to hit for most apps                                   |
| Requires `@react-native-firebase/remote-config` >= 18.0.0 | Graceful fallback if unavailable                                |
| iOS intermittent fetch failures                           | Defaults/cached values used                                     |
| Web not supported                                         | Fallback provider returns `DEFAULT_FLAGS` on web                |

## Testing

### Unit Tests

- Mock the feature flag client in `__tests__/setup.ts`
- Create test-specific providers with flag overrides
- Test both loading and ready states

### Manual Testing

1. Ensure `EXPO_PUBLIC_TURN_ON_FIREBASE=true` in `.env.local`
2. Run the app on iOS/Android simulator
3. Change a flag value in Firebase Console and publish
4. The app should reflect the change within seconds
5. Check console logs for `[FeatureFlags] Real-time update`

### Testing Without Firebase

Set `EXPO_PUBLIC_TURN_ON_FIREBASE=false` to use the fallback provider. All flags return their `DEFAULT_FLAGS` values.

## Dev vs Prod Configuration

**Option 1: Separate Firebase projects (recommended)**

- Use different `google-services.json` / `GoogleService-Info.plist` per environment
- Configure via `app.json` or EAS build profiles
- Complete isolation between environments

**Option 2: Single project with conditions**

- Use Remote Config conditions based on app version or custom signals
- Less isolation but simpler setup

## Related Documentation

- [Firebase Setup](./firebase-setup.md) - Full Firebase configuration including Remote Config
- [Firebase Remote Config docs](https://firebase.google.com/docs/remote-config)
- [Real-time Remote Config](https://firebase.google.com/docs/remote-config/ios/real-time)
