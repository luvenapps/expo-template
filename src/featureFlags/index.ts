import { Platform } from 'react-native';
import { createFallbackProvider } from './providers/fallback';
import { createFirebaseProvider } from './providers/firebase';
import { DEFAULT_FLAGS } from './types';
import type {
  FeatureFlagClient,
  FeatureFlagKey,
  FeatureFlagSource,
  FeatureFlagStatus,
  FeatureFlagValue,
} from './types';

let client: FeatureFlagClient | null = null;

function isFirebaseRuntimeEnabled() {
  return (
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === 'true' ||
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === '1'
  );
}

export function getFeatureFlagClient(): FeatureFlagClient {
  if (!client) {
    const useFirebase = isFirebaseRuntimeEnabled() && Platform.OS !== 'web';
    const newClient = useFirebase ? createFirebaseProvider() : createFallbackProvider();

    // Clean up old client on hot reload (dev only)
    if (
      __DEV__ &&
      (module as unknown as { hot?: { dispose: (callback: () => void) => void } }).hot
    ) {
      (module as unknown as { hot: { dispose: (callback: () => void) => void } }).hot.dispose(
        () => {
          newClient.destroy();
        },
      );
    }

    client = newClient;
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

export { DEFAULT_FLAGS };
export type { FeatureFlagKey, FeatureFlagValue, FeatureFlagSource };
