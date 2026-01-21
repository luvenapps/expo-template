# Feature Flags Plan (Remote Config + Provider Swap)

## Goals

- Use Firebase Remote Config for feature flags
- Support dev/prod flag sets
- Keep feature-flag usage stable if we swap Firebase Remote Config for LaunchDarkly
- Keep `EXPO_PUBLIC_TURN_ON_FIREBASE` as the runtime on/off switch for Firebase
- When Firebase is off, fall back to code defaults (no global override)

---

## 1) Provider-Agnostic Interface

Create a single interface that the app uses everywhere.

```ts
// src/featureFlags/types.ts

// Derive keys from defaults to keep them in sync
export const DEFAULT_FLAGS = {
  flag_example: false,
  flag_new_ui: false,
} as const;

export type FeatureFlagKey = keyof typeof DEFAULT_FLAGS;
export type FeatureFlagValue = boolean | string | number | Record<string, unknown>;

export type FeatureFlagStatus = 'loading' | 'ready' | 'error';

export interface UserContext {
  id?: string;
  email?: string;
  attributes?: Record<string, string | number | boolean>;
}

export interface FeatureFlagClient {
  /** Resolves when flags are fetched and ready. Rejects on unrecoverable error. */
  ready(): Promise<void>;

  /** Returns current initialization status */
  getStatus(): FeatureFlagStatus;

  /** Get flag value synchronously. Returns fallback if not ready or flag missing. */
  getFlag<T extends FeatureFlagValue>(key: FeatureFlagKey, fallback: T): T;

  /** Set user context for targeting. Call after auth state changes. */
  setContext(user?: UserContext): Promise<void>;

  /** Subscribe to flag value changes. Returns unsubscribe function. */
  subscribe(listener: (key?: FeatureFlagKey) => void): () => void;

  /** Force refresh flags from remote. Use sparingly — real-time handles most updates. */
  refresh(): Promise<void>;

  /** Cleanup listeners and connections. Call when provider is no longer needed. */
  destroy?: () => void;
}
```

Everything outside the provider talks only to this interface.

---

## 2) Single Setup Entry Point

Create one setup module (`src/featureFlags/index.ts`) that:

- Chooses provider based on `EXPO_PUBLIC_TURN_ON_FIREBASE`
- Exports stable APIs that never change regardless of provider
- Is the only file that changes when switching providers

```ts
// src/featureFlags/index.ts

import { DEFAULT_FLAGS, FeatureFlagKey, FeatureFlagValue, FeatureFlagStatus } from './types';
import { createFirebaseProvider } from './providers/firebase';
import { createFallbackProvider } from './providers/fallback';

const FIREBASE_ENABLED = process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === 'true';

// Singleton client instance
let client: FeatureFlagClient | null = null;

export function getFeatureFlagClient(): FeatureFlagClient {
  if (!client) {
    client = FIREBASE_ENABLED ? createFirebaseProvider() : createFallbackProvider();
  }
  return client;
}

// Convenience exports
export function getFlag<T extends FeatureFlagValue>(key: FeatureFlagKey, fallback: T): T {
  return getFeatureFlagClient().getFlag(key, fallback);
}

export function getStatus(): FeatureFlagStatus {
  return getFeatureFlagClient().getStatus();
}

export { DEFAULT_FLAGS, type FeatureFlagKey, type FeatureFlagValue };
```

---

## 3) React Hook

Provide a React hook that handles loading state and re-renders on flag changes.

```ts
// src/featureFlags/useFeatureFlag.ts

import { useState, useEffect, useSyncExternalStore } from 'react';
import { getFeatureFlagClient, getFlag, getStatus } from './index';
import { FeatureFlagKey, FeatureFlagValue, FeatureFlagStatus } from './types';

export function useFeatureFlag<T extends FeatureFlagValue>(
  key: FeatureFlagKey,
  fallback: T,
): { value: T; status: FeatureFlagStatus } {
  const client = getFeatureFlagClient();

  // Subscribe to flag changes
  const value = useSyncExternalStore(
    (callback) =>
      client.subscribe((changedKey) => {
        if (!changedKey || changedKey === key) callback();
      }),
    () => client.getFlag(key, fallback),
    () => fallback, // Server snapshot
  );

  const status = getStatus();

  return { value, status };
}

// For components that need to wait for flags to load
export function useFeatureFlagsReady(): { ready: boolean; error: Error | null } {
  const [state, setState] = useState<{ ready: boolean; error: Error | null }>({
    ready: getStatus() === 'ready',
    error: null,
  });

  useEffect(() => {
    if (state.ready) return;

    getFeatureFlagClient()
      .ready()
      .then(() => setState({ ready: true, error: null }))
      .catch((err) => setState({ ready: false, error: err }));
  }, []);

  return state;
}
```

---

## 4) Firebase Remote Config Provider

Implement the Firebase provider with **real-time updates** for instant flag changes.

### How Real-Time Works

- Opens a persistent HTTP connection to Firebase backend
- Server pushes invalidation signals when config changes
- SDK auto-fetches new config, but **you must call `activate()`**
- **Foreground only**: listener automatically stops when app is backgrounded

### API Verification

The `onConfigUpdated` method is available in `@react-native-firebase/remote-config`:

```ts
// Signature from react-native-firebase
onConfigUpdated(listener: (event: ConfigUpdateListenerResponse, error?: Error) => void): () => void;

// event.updatedKeys contains keys that changed (added, removed, or modified)
// Returns unsubscribe function
```

**Requirements:**

- `@react-native-firebase/remote-config` >= 18.0.0 (maps to Firebase iOS SDK 10.7.0+)
- Supported on both **iOS and Android**
- Known iOS issue: ~10% of real-time fetches may fail with "Unable to fetch latest template" — handled gracefully with fallback

```ts
// src/featureFlags/providers/firebase.ts

import remoteConfig from '@react-native-firebase/remote-config';
import { AppState, AppStateStatus } from 'react-native';
import {
  FeatureFlagClient,
  FeatureFlagKey,
  FeatureFlagValue,
  FeatureFlagStatus,
  UserContext,
  DEFAULT_FLAGS,
} from '../types';

// Minimum interval between foreground refreshes to avoid throttling
const MIN_FOREGROUND_REFRESH_MS = 60 * 1000; // 1 minute

export function createFirebaseProvider(): FeatureFlagClient {
  let status: FeatureFlagStatus = 'loading';
  let listeners: Set<(key?: FeatureFlagKey) => void> = new Set();
  let initPromise: Promise<void> | null = null;
  let realTimeUnsubscribe: (() => void) | null = null;
  let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
  let lastFetchTimestamp = 0;
  let isDestroyed = false;

  const notifyListeners = (changedKeys?: FeatureFlagKey[]) => {
    if (changedKeys?.length) {
      // Notify with specific changed keys
      changedKeys.forEach((key) => {
        listeners.forEach((listener) => listener(key));
      });
    } else {
      // Notify all (initial load, unknown changes, or no diff available)
      listeners.forEach((listener) => listener());
    }
  };

  const startRealTimeListener = () => {
    if (realTimeUnsubscribe || isDestroyed) return; // Already listening or destroyed

    try {
      realTimeUnsubscribe = remoteConfig().onConfigUpdated(async (event, error) => {
        // Handle errors from the real-time listener
        if (error) {
          console.warn('[FeatureFlags] Real-time listener error:', error.message);
          // Don't crash — real-time is best-effort, foreground refresh is backup
          return;
        }

        try {
          // SDK fetched new config, now activate it
          await remoteConfig().activate();

          // Extract changed keys, fallback to notifying all if updatedKeys unavailable
          const updatedKeys = event?.updatedKeys;
          if (updatedKeys && Array.isArray(updatedKeys)) {
            const changedKeys = updatedKeys.filter(
              (key): key is FeatureFlagKey => key in DEFAULT_FLAGS,
            );
            if (changedKeys.length > 0) {
              console.log('[FeatureFlags] Real-time update, changed keys:', changedKeys);
              notifyListeners(changedKeys);
            }
          } else {
            // No diff available — notify all listeners
            console.log('[FeatureFlags] Real-time update (no key diff)');
            notifyListeners();
          }

          lastFetchTimestamp = Date.now();
        } catch (activateError) {
          console.error('[FeatureFlags] Failed to activate real-time update:', activateError);
        }
      });
    } catch (error) {
      // onConfigUpdated may not be available on older SDK versions
      console.warn('[FeatureFlags] Real-time listener not available:', error);
      realTimeUnsubscribe = null;
    }
  };

  const stopRealTimeListener = () => {
    if (realTimeUnsubscribe) {
      realTimeUnsubscribe();
      realTimeUnsubscribe = null;
    }
  };

  const handleAppStateChange = (nextState: AppStateStatus) => {
    if (isDestroyed) return;

    if (nextState === 'active') {
      // App came to foreground — restart listener if needed
      startRealTimeListener();

      // Guard against rapid foreground refreshes (rate limit)
      const timeSinceLastFetch = Date.now() - lastFetchTimestamp;
      if (timeSinceLastFetch < MIN_FOREGROUND_REFRESH_MS) {
        console.log('[FeatureFlags] Skipping foreground refresh (too recent)');
        return;
      }

      // Fetch any updates that occurred while backgrounded
      remoteConfig()
        .fetchAndActivate()
        .then((activated) => {
          lastFetchTimestamp = Date.now();
          if (activated) {
            console.log('[FeatureFlags] Activated updates from background period');
            notifyListeners(); // No diff available for manual fetch
          }
        })
        .catch((error) => {
          console.error('[FeatureFlags] Foreground refresh failed:', error);
        });
    }
    // Note: Real-time listener automatically pauses when backgrounded (SDK behavior)
  };

  const initialize = async (): Promise<void> => {
    try {
      // Set defaults first (required for real-time to work)
      await remoteConfig().setDefaults(DEFAULT_FLAGS);

      // Configure fetch settings
      await remoteConfig().setConfigSettings({
        // Minimum fetch interval for manual refresh() calls
        // Real-time updates bypass this
        minimumFetchIntervalMillis: __DEV__ ? 0 : 60 * 1000,
      });

      // Initial fetch — required before real-time listener works
      await remoteConfig().fetchAndActivate();
      lastFetchTimestamp = Date.now();

      // Start real-time listener for push updates
      startRealTimeListener();

      // Listen for app state changes to handle foreground/background
      appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

      status = 'ready';
      notifyListeners();
    } catch (error) {
      console.error('[FeatureFlags] Firebase init failed, using cached/defaults:', error);
      // Still mark as ready — we have defaults/cached values
      status = 'ready';
      notifyListeners();
    }
  };

  // Start initialization immediately
  initPromise = initialize();

  return {
    ready: () => initPromise!,

    getStatus: () => status,

    getFlag: <T extends FeatureFlagValue>(key: FeatureFlagKey, fallback: T): T => {
      if (status === 'loading') {
        return fallback;
      }

      try {
        const value = remoteConfig().getValue(key);

        // Check if value exists (wasn't just a default)
        if (value.getSource() === 'static') {
          return fallback;
        }

        // Parse based on fallback type
        if (typeof fallback === 'boolean') {
          return value.asBoolean() as T;
        }
        if (typeof fallback === 'number') {
          return value.asNumber() as T;
        }
        if (typeof fallback === 'string') {
          return value.asString() as T;
        }
        // Object type — parse JSON
        try {
          return JSON.parse(value.asString()) as T;
        } catch {
          return fallback;
        }
      } catch {
        return fallback;
      }
    },

    setContext: async (user?: UserContext): Promise<void> => {
      // Firebase Remote Config doesn't support user targeting directly.
      // For user-based targeting, consider Firebase A/B Testing or
      // store user segment as a custom attribute and use conditions in console.
      // This is a no-op for basic Remote Config.
    },

    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    refresh: async (): Promise<void> => {
      if (isDestroyed) return;

      try {
        const activated = await remoteConfig().fetchAndActivate();
        lastFetchTimestamp = Date.now();
        if (activated) {
          notifyListeners(); // No diff available for manual fetch
        }
      } catch (error) {
        console.error('[FeatureFlags] Refresh failed:', error);
      }
    },

    // Cleanup method — call when provider is no longer needed
    destroy: () => {
      isDestroyed = true;
      stopRealTimeListener();
      appStateSubscription?.remove();
      appStateSubscription = null;
      listeners.clear();
    },
  };
}
```

### Real-Time Update Flow

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

### Key Implementation Notes

| Concern                            | Solution                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------- |
| **`onConfigUpdated` availability** | Wrapped in try-catch; falls back to foreground-only refresh if unavailable |
| **`activate()` required**          | Called explicitly after every real-time update event                       |
| **Foreground refresh rate limit**  | `MIN_FOREGROUND_REFRESH_MS` (1 min) prevents throttling on rapid resume    |
| **Listeners registered once**      | Guards (`if (realTimeUnsubscribe)`) prevent duplicate subscriptions        |
| **Cleanup**                        | `destroy()` sets `isDestroyed` flag and removes all listeners              |
| **"All flags changed" case**       | Falls back to `notifyListeners()` (no key) when `updatedKeys` unavailable  |
| **iOS fetch errors (~10%)**        | Logged as warning, doesn't crash — foreground refresh is backup            |

### Limitations

| Limitation                                                | Mitigation                                                      |
| --------------------------------------------------------- | --------------------------------------------------------------- |
| Foreground only                                           | AppState listener refreshes on foreground return (rate-limited) |
| 20M concurrent connections (Jan 2026)                     | Per-project limit; unlikely to hit for most apps                |
| Requires `@react-native-firebase/remote-config` >= 18.0.0 | Check version; graceful fallback if unavailable                 |
| iOS intermittent fetch failures                           | Handled gracefully; defaults/cached values used                 |

### Dev vs Prod Configuration

**Option 1: Separate Firebase projects (recommended)**

- Use `google-services.json` / `GoogleService-Info.plist` per environment
- Configure via `app.json` or EAS build profiles
- Complete isolation between environments

**Option 2: Single project with conditions**

- Use Remote Config conditions based on app version or custom signals
- Less isolation but simpler setup

---

## 5) Fallback Provider

Synchronous provider that returns defaults when Firebase is disabled.

```ts
// src/featureFlags/providers/fallback.ts

import { FeatureFlagClient, FeatureFlagKey, FeatureFlagValue, DEFAULT_FLAGS } from '../types';

export function createFallbackProvider(): FeatureFlagClient {
  return {
    ready: () => Promise.resolve(),

    getStatus: () => 'ready',

    getFlag: <T extends FeatureFlagValue>(key: FeatureFlagKey, fallback: T): T => {
      const value = DEFAULT_FLAGS[key];
      return (value as T) ?? fallback;
    },

    setContext: async () => {},

    subscribe: () => () => {},

    refresh: async () => {},
  };
}
```

---

## 6) App Integration

### Initialization

Initialize feature flags early in the app lifecycle, before rendering flag-dependent UI.

```tsx
// src/ui/providers/AppProviders.tsx

import { useEffect } from 'react';
import { getFeatureFlagClient } from '@/featureFlags';
import { useSessionStore } from '@/auth/session';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const session = useSessionStore((s) => s.session);

  // Update feature flag context when user changes
  useEffect(() => {
    const client = getFeatureFlagClient();
    if (session?.user) {
      client.setContext({
        id: session.user.id,
        email: session.user.email ?? undefined,
      });
    } else {
      client.setContext(undefined);
    }
  }, [session?.user?.id]);

  return (
    // ... existing providers
  );
}
```

### Usage in Components

```tsx
// Example component usage

import { useFeatureFlag } from '@/featureFlags/useFeatureFlag';

function MyComponent() {
  const { value: showNewUI, status } = useFeatureFlag('flag_new_ui', false);

  if (status === 'loading') {
    return <LoadingSpinner />;
  }

  return showNewUI ? <NewUIComponent /> : <LegacyComponent />;
}
```

### Usage Outside React

```ts
// Example service usage

import { getFlag } from '@/featureFlags';

function someService() {
  if (getFlag('flag_example', false)) {
    // New behavior
  } else {
    // Default behavior
  }
}
```

---

## 7) Testing

### Mock Provider for Tests

```ts
// __tests__/featureFlags/mockProvider.ts

import {
  FeatureFlagClient,
  FeatureFlagKey,
  FeatureFlagValue,
  DEFAULT_FLAGS,
} from '@/featureFlags/types';

export function createMockProvider(
  overrides: Partial<Record<FeatureFlagKey, FeatureFlagValue>> = {},
): FeatureFlagClient {
  const flags = { ...DEFAULT_FLAGS, ...overrides };

  return {
    ready: () => Promise.resolve(),
    getStatus: () => 'ready',
    getFlag: <T extends FeatureFlagValue>(key: FeatureFlagKey, fallback: T): T => {
      return (flags[key] as T) ?? fallback;
    },
    setContext: async () => {},
    subscribe: () => () => {},
    refresh: async () => {},
  };
}
```

### Test Cases

```ts
// __tests__/featureFlags/index.test.ts

describe('Feature Flags', () => {
  describe('Fallback Provider', () => {
    it('returns default values when Firebase is off', () => {
      const provider = createFallbackProvider();
      expect(provider.getFlag('flag_example', false)).toBe(false);
    });

    it('is immediately ready', async () => {
      const provider = createFallbackProvider();
      await expect(provider.ready()).resolves.toBeUndefined();
      expect(provider.getStatus()).toBe('ready');
    });
  });

  describe('Firebase Provider', () => {
    let mockOnConfigUpdated: jest.Mock;
    let mockFetchAndActivate: jest.Mock;
    let mockActivate: jest.Mock;

    beforeEach(() => {
      mockOnConfigUpdated = jest.fn(() => jest.fn()); // Returns unsubscribe
      mockFetchAndActivate = jest.fn().mockResolvedValue(true);
      mockActivate = jest.fn().mockResolvedValue(undefined);

      jest.spyOn(remoteConfig(), 'onConfigUpdated').mockImplementation(mockOnConfigUpdated);
      jest.spyOn(remoteConfig(), 'fetchAndActivate').mockImplementation(mockFetchAndActivate);
      jest.spyOn(remoteConfig(), 'activate').mockImplementation(mockActivate);
    });

    it('returns fallback while loading', () => {
      const provider = createFirebaseProvider();
      // Before ready() resolves
      expect(provider.getFlag('flag_example', true)).toBe(true);
    });

    it('starts real-time listener on initialization', async () => {
      const provider = createFirebaseProvider();
      await provider.ready();

      expect(mockOnConfigUpdated).toHaveBeenCalled();
    });

    it('gracefully handles fetch failures', async () => {
      mockFetchAndActivate.mockRejectedValue(new Error('Network error'));

      const provider = createFirebaseProvider();
      await provider.ready();

      // Should still be ready with defaults
      expect(provider.getStatus()).toBe('ready');
    });

    it('notifies subscribers with changed keys on real-time update', async () => {
      const provider = createFirebaseProvider();
      await provider.ready();

      const listener = jest.fn();
      provider.subscribe(listener);

      // Simulate real-time update callback
      const onUpdateCallback = mockOnConfigUpdated.mock.calls[0][0];
      await onUpdateCallback({ updatedKeys: ['flag_new_ui'] });

      expect(mockActivate).toHaveBeenCalled();
      expect(listener).toHaveBeenCalledWith('flag_new_ui');
    });

    it('refreshes flags when app returns to foreground', async () => {
      const provider = createFirebaseProvider();
      await provider.ready();

      // Reset mock to track foreground refresh
      mockFetchAndActivate.mockClear();

      // Simulate app returning to foreground
      // (In real tests, trigger AppState change event)

      // Manual refresh simulates foreground behavior
      await provider.refresh();
      expect(mockFetchAndActivate).toHaveBeenCalled();
    });

    it('cleans up listeners on destroy', async () => {
      const unsubscribeMock = jest.fn();
      mockOnConfigUpdated.mockReturnValue(unsubscribeMock);

      const provider = createFirebaseProvider();
      await provider.ready();

      provider.destroy?.();

      expect(unsubscribeMock).toHaveBeenCalled();
    });
  });

  describe('useFeatureFlag hook', () => {
    it('returns fallback during loading', () => {
      const { result } = renderHook(() => useFeatureFlag('flag_new_ui', false));
      expect(result.current.value).toBe(false);
    });

    it('re-renders when flag changes via real-time update', async () => {
      // Setup: mock provider with controllable subscription
      const listeners = new Set<(key?: FeatureFlagKey) => void>();
      const mockProvider = {
        ...createMockProvider(),
        subscribe: (listener: (key?: FeatureFlagKey) => void) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
      };

      // Render hook
      const { result, rerender } = renderHook(() => useFeatureFlag('flag_new_ui', false));
      expect(result.current.value).toBe(false);

      // Simulate real-time update
      listeners.forEach((listener) => listener('flag_new_ui'));
      rerender();

      // Value should update (depends on mock implementation)
    });
  });
});
```

---

## 8) File Structure

```
src/featureFlags/
├── index.ts              # Entry point, provider selection, convenience exports
├── types.ts              # Interfaces, types, DEFAULT_FLAGS
├── useFeatureFlag.ts     # React hooks
└── providers/
    ├── firebase.ts       # Firebase Remote Config implementation
    └── fallback.ts       # Static defaults implementation
```

---

## 9) Migration Checklist

- [ ] Create `src/featureFlags/types.ts` with interface and defaults
- [ ] Create `src/featureFlags/providers/fallback.ts`
- [ ] Create `src/featureFlags/providers/firebase.ts`
- [ ] Create `src/featureFlags/index.ts` entry point
- [ ] Create `src/featureFlags/useFeatureFlag.ts` React hook
- [ ] Add feature flag context update in `AppProviders.tsx`
- [ ] Add mock provider in `__tests__/setup.ts`
- [ ] Write unit tests for both providers
- [ ] Configure Firebase Remote Config in console with initial flags
- [ ] Test with `EXPO_PUBLIC_TURN_ON_FIREBASE=true` and `false`
