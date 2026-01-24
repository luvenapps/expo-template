import { FeatureFlagClient, FeatureFlagStatus, FeatureFlagValue } from './types';

// In tests, allow any string as a flag key (not limited to DEFAULT_FLAGS)
export function createMockProvider(
  overrides: Partial<Record<string, FeatureFlagValue>> = {},
  status: FeatureFlagStatus = 'ready',
) {
  const listeners = new Set<(key?: string) => void>();
  const values = { ...overrides } as Partial<Record<string, FeatureFlagValue>>;

  const client: FeatureFlagClient = {
    ready: () => Promise.resolve(),
    getStatus: () => status,
    getFlag: <T extends FeatureFlagValue>(key: string, fallback: T): T => {
      if (key in values) {
        return values[key] as T;
      }
      return fallback;
    },
    getSource: () => 'default',
    setContext: () => Promise.resolve(),
    refresh: () => Promise.resolve(),
    subscribe: (listener) => {
      listeners.add(listener as (key?: string) => void);
      return () => {
        listeners.delete(listener as (key?: string) => void);
      };
    },
    destroy: () => {
      listeners.clear();
    },
  };

  const notify = (key?: string) => {
    listeners.forEach((listener) => listener(key));
  };

  const set = (key: string, value: FeatureFlagValue) => {
    values[key] = value;
    notify(key);
  };

  return { client, notify, set };
}
