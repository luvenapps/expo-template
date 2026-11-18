import { DEFAULT_FLAGS, FeatureFlagClient, FeatureFlagKey, FeatureFlagValue } from '../types';

export function createFallbackProvider(): FeatureFlagClient {
  const listeners = new Set<(key?: FeatureFlagKey) => void>();

  return {
    ready: () => Promise.resolve(),
    getStatus: () => 'ready',
    getFlag: <T extends FeatureFlagValue>(key: FeatureFlagKey, fallback: T): T => {
      if (key in DEFAULT_FLAGS) {
        return DEFAULT_FLAGS[key] as T;
      }
      return fallback;
    },
    getSource: () => 'default',
    setContext: () => Promise.resolve(),
    refresh: () => Promise.resolve(),
    subscribe: (listener: (key?: FeatureFlagKey) => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    destroy: () => {
      listeners.clear();
    },
  };
}
