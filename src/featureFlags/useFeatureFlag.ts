import { useEffect, useRef, useSyncExternalStore } from 'react';
import { getFeatureFlagClient, getFlag, getStatus } from './index';
import { FeatureFlagKey, FeatureFlagStatus, FeatureFlagValue } from './types';

export function useFeatureFlag<T extends FeatureFlagValue>(
  key: FeatureFlagKey,
  fallback: T,
): { value: T; status: FeatureFlagStatus } {
  const client = getFeatureFlagClient();
  const snapshotRef = useRef<{ status: FeatureFlagStatus; value: T } | null>(null);

  useEffect(() => {
    client.ready().catch(() => undefined);
  }, [client]);

  const snapshot = useSyncExternalStore(
    (listener) =>
      client.subscribe((changedKey) => {
        if (!changedKey || changedKey === key) {
          listener();
        }
      }),
    () => {
      const nextStatus = getStatus();
      const nextValue = getFlag(key, fallback);
      const current = snapshotRef.current;
      if (current && Object.is(current.status, nextStatus) && Object.is(current.value, nextValue)) {
        return current;
      }
      const nextSnapshot = { status: nextStatus, value: nextValue as T };
      snapshotRef.current = nextSnapshot;
      return nextSnapshot;
    },
    () => {
      const nextStatus = getStatus();
      const nextValue = getFlag(key, fallback);
      const current = snapshotRef.current;
      if (current && Object.is(current.status, nextStatus) && Object.is(current.value, nextValue)) {
        return current;
      }
      const nextSnapshot = { status: nextStatus, value: nextValue as T };
      snapshotRef.current = nextSnapshot;
      return nextSnapshot;
    },
  );

  return { value: snapshot.value as T, status: snapshot.status };
}

export function useFeatureFlagsReady(): { ready: boolean; status: FeatureFlagStatus } {
  const client = getFeatureFlagClient();

  useEffect(() => {
    client.ready().catch(() => undefined);
  }, [client]);

  const status = useSyncExternalStore(
    (listener) => client.subscribe(listener),
    () => getStatus(),
    () => getStatus(),
  );

  return { ready: status === 'ready', status };
}
