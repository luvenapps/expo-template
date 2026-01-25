# Feature Flags

This document explains the provider-agnostic feature flag system. For Firebase Remote Config setup and implementation details, see [firebase-setup.md](./firebase-setup.md#5-remote-config-feature-flags).

## Overview

Feature flags allow toggling features remotely without app updates. The system uses a provider-agnostic interface that supports multiple implementations:

- **Remote Config provider** (default when enabled via `EXPO_PUBLIC_TURN_ON_FIREBASE`)
- **Fallback provider** (code defaults only)
- **Extensible** - can swap to other providers (e.g., LaunchDarkly, Split.io)

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

| Environment Variable                 | Provider Used | Behavior                       |
| ------------------------------------ | ------------- | ------------------------------ |
| `EXPO_PUBLIC_TURN_ON_FIREBASE=true`  | Remote Config | Uses the configured provider   |
| `EXPO_PUBLIC_TURN_ON_FIREBASE=false` | Fallback      | Returns `DEFAULT_FLAGS` values |

### Key Components

| Component                     | Purpose                                                  |
| ----------------------------- | -------------------------------------------------------- |
| `FeatureFlagClient` interface | Provider-agnostic contract for all implementations       |
| `DEFAULT_FLAGS` in `types.ts` | Source of truth for flag keys and default values         |
| `useFeatureFlag` hook         | React hook for consuming flags with automatic re-renders |
| `getFlag()` function          | Synchronous flag access for non-React code               |

## Adding New Flags

1. **Add to `DEFAULT_FLAGS`** in [src/featureFlags/types.ts](../src/featureFlags/types.ts):

   ```typescript
   export const DEFAULT_FLAGS = {
     test_feature_flag: false,
     new_onboarding_flow: true,
     max_items_per_page: 20,
     flag_your_feature: false, // Add here
   } as const;
   ```

2. **Add to your provider** (e.g., Firebase Console for Firebase provider)

3. **Use in code**:

   ```typescript
   // In React components
   import { useFeatureFlag } from '@/featureFlags/useFeatureFlag';

   const { value: enabled, status } = useFeatureFlag('flag_your_feature', false);

   // Outside React
   import { getFlag } from '@/featureFlags';

   const enabled = getFlag('flag_your_feature', false);
   ```

## Usage Patterns

### In React Components

Use the `useFeatureFlag` hook for automatic re-renders when flags change:

```typescript
import { useFeatureFlag } from '@/featureFlags/useFeatureFlag';

function MyComponent() {
  const { value: enabled, status } = useFeatureFlag('new_onboarding_flow', false);

  if (status === 'loading') {
    return <LoadingSpinner />;
  }

  return enabled ? <NewOnboarding /> : <OldOnboarding />;
}
```

**Returns**:

- `value` - The flag value (boolean, string, number, or object)
- `status` - `'loading'` | `'ready'` | `'error'`

### Outside React

Use the `getFlag()` function for synchronous access:

```typescript
import { getFlag } from '@/featureFlags';

// In services, utilities, initialization code
const maxItems = getFlag('max_items_per_page', 20);
```

**Note**: Returns the fallback value if flags aren't ready yet.

### Waiting for Flags to Load

Use `useFeatureFlagsReady` when you need to block rendering until flags are available:

```typescript
import { useFeatureFlagsReady } from '@/featureFlags/useFeatureFlag';

function App() {
  const { ready, status } = useFeatureFlagsReady();

  if (!ready) {
    return <SplashScreen />;
  }

  return <MainApp />;
}
```

## Status Management

The feature flag client progresses through these states:

| Status    | Meaning                                             |
| --------- | --------------------------------------------------- |
| `loading` | Client is initializing, values may not be final     |
| `ready`   | Client initialized, values are available            |
| `error`   | Initialization failed (falls back to code defaults) |

**Best practices**:

- Show loading UI while `status === 'loading'`
- Proceed with flag values when `status === 'ready'`
- Gracefully handle `error` status (defaults are still available)

## Manual Refresh

Force the client to fetch fresh values:

```typescript
import { getFeatureFlagClient } from '@/featureFlags';

const client = getFeatureFlagClient();
await client.refresh();
```

**Use cases**:

- User-triggered refresh
- After authentication changes
- Debugging/testing

## Testing

### Unit Tests

Mock the feature flag client for tests:

```typescript
import { __setFeatureFlagClientForTests } from '@/featureFlags';
import { createMockProvider } from '@/featureFlags/testing';

describe('MyFeature', () => {
  afterEach(() => {
    __setFeatureFlagClientForTests(null);
  });

  it('works with feature enabled', () => {
    const { client } = createMockProvider({ my_feature: true });
    __setFeatureFlagClientForTests(client);

    // Test with my_feature enabled
  });

  it('works with feature disabled', () => {
    const { client } = createMockProvider({ my_feature: false });
    __setFeatureFlagClientForTests(client);

    // Test with my_feature disabled
  });
});
```

### Dynamic Flag Changes in Tests

```typescript
it('responds to flag changes', () => {
  const { client, set } = createMockProvider({ my_feature: false });
  __setFeatureFlagClientForTests(client);

  const { result } = renderHook(() => useFeatureFlag('my_feature', false));
  expect(result.current.value).toBe(false);

  act(() => {
    set('my_feature', true);
  });

  expect(result.current.value).toBe(true);
});
```

### Testing Different States

```typescript
it('handles loading state', () => {
  const { client } = createMockProvider({}, 'loading');
  __setFeatureFlagClientForTests(client);

  const { result } = renderHook(() => useFeatureFlag('my_feature', false));
  expect(result.current.status).toBe('loading');
});

it('handles ready state', () => {
  const { client } = createMockProvider({}, 'ready');
  __setFeatureFlagClientForTests(client);

  const { result } = renderHook(() => useFeatureFlag('my_feature', false));
  expect(result.current.status).toBe('ready');
});
```

## Provider Interface

To implement a custom provider, implement the `FeatureFlagClient` interface:

```typescript
export interface FeatureFlagClient {
  ready(): Promise<void>;
  getStatus(): FeatureFlagStatus;
  getFlag<T extends FeatureFlagValue>(key: FeatureFlagKey, fallback: T): T;
  setContext(context?: UserContext): Promise<void>;
  refresh(): Promise<void>;
  subscribe(listener: (key?: FeatureFlagKey) => void): () => void;
  destroy(): void;
}
```

### Key Methods

| Method         | Purpose                                                       |
| -------------- | ------------------------------------------------------------- |
| `ready()`      | Async initialization, resolves when client is ready           |
| `getStatus()`  | Returns current status: `'loading'` \| `'ready'` \| `'error'` |
| `getFlag()`    | Synchronously get flag value with fallback                    |
| `getSource()`  | Get source of flag value                                      |
| `setContext()` | Update user context for targeting (provider-specific)         |
| `refresh()`    | Force fetch fresh values from remote                          |
| `subscribe()`  | Subscribe to flag changes, returns unsubscribe function       |
| `destroy()`    | Cleanup resources, remove listeners                           |

### Subscriber Pattern

Providers must notify subscribers when flags change:

```typescript
const listeners = new Set<(key?: FeatureFlagKey) => void>();

// Notify all listeners
listeners.forEach((listener) => listener());

// Notify listeners for specific key
listeners.forEach((listener) => listener('my_feature'));

// Subscribe returns unsubscribe function
subscribe: (listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
```

## Related Documentation

- [Firebase Setup](./firebase-setup.md#5-remote-config-feature-flags) - Firebase Remote Config implementation details
- [Firebase Remote Config docs](https://firebase.google.com/docs/remote-config) - Official Firebase documentation
