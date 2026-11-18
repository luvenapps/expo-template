import { createFallbackProvider } from './providers/fallback';
import { createFirebaseProvider } from './providers/firebase';
import type {
  FeatureFlagClient,
  FeatureFlagKey,
  FeatureFlagSource,
  FeatureFlagStatus,
  FeatureFlagValue,
} from './types';
import { DEFAULT_FLAGS } from './types';

let client: FeatureFlagClient | null = null;

type HotModule = {
  dispose: (callback: () => void) => void;
  accept: (callback?: () => void) => void;
};

function setupHotReload(hot?: HotModule) {
  if (!__DEV__ || !hot) {
    return;
  }

  // Clean up on dispose (before hot reload)
  hot.dispose(() => {
    if (client) {
      client.destroy();
      client = null;
    }
  });

  // Accept hot updates and force re-initialization
  hot.accept(() => {
    // Force re-initialization on hot reload
    if (client) {
      client.destroy();
      client = null;
    }
  });
}

// Handle hot reload cleanup
setupHotReload((module as unknown as { hot?: HotModule }).hot);

function isFirebaseRuntimeEnabled() {
  return (
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === 'true' ||
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === '1'
  );
}

export function getFeatureFlagClient(): FeatureFlagClient {
  if (!client) {
    const useFirebase = isFirebaseRuntimeEnabled();
    client = useFirebase ? createFirebaseProvider() : createFallbackProvider();
    client.ready().catch(() => undefined);
  }
  return client;
}

export function getFlag<T extends FeatureFlagValue>(key: FeatureFlagKey, fallback: T): T {
  return getFeatureFlagClient().getFlag(key, fallback);
}

export function getStatus(): FeatureFlagStatus {
  return getFeatureFlagClient().getStatus();
}

export function getSource(key: FeatureFlagKey): FeatureFlagSource {
  return getFeatureFlagClient().getSource(key);
}

/** @internal */
export function __setFeatureFlagClientForTests(nextClient: FeatureFlagClient | null) {
  client = nextClient;
}

/** @internal */
export function __setupHotReloadForTests(hot?: HotModule) {
  setupHotReload(hot);
}

export { DEFAULT_FLAGS };
export type { FeatureFlagKey, FeatureFlagSource, FeatureFlagValue };
