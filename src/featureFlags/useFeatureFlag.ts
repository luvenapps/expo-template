import { useEffect, useRef, useSyncExternalStore } from 'react';
import { getFeatureFlagClient, getFlag, getSource, getStatus } from './index';
import { FeatureFlagKey, FeatureFlagSource, FeatureFlagStatus, FeatureFlagValue } from './types';

export function useFeatureFlag<T extends FeatureFlagValue>(
  key: FeatureFlagKey,
  fallback: T,
): { value: T; status: FeatureFlagStatus; source: FeatureFlagSource } {
  const client = getFeatureFlagClient();
  const snapshotRef = useRef<{
    status: FeatureFlagStatus;
    value: T;
    source: FeatureFlagSource;
  } | null>(null);

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
      const nextSource = getSource(key);
      const current = snapshotRef.current;
      if (
        current &&
        Object.is(current.status, nextStatus) &&
        Object.is(current.value, nextValue) &&
        Object.is(current.source, nextSource)
      ) {
        return current;
      }
      const nextSnapshot = { status: nextStatus, value: nextValue as T, source: nextSource };
      snapshotRef.current = nextSnapshot;
      return nextSnapshot;
    },
    () => {
      const nextStatus = getStatus();
      const nextValue = getFlag(key, fallback);
      const nextSource = getSource(key);
      const current = snapshotRef.current;
      if (
        current &&
        Object.is(current.status, nextStatus) &&
        Object.is(current.value, nextValue) &&
        Object.is(current.source, nextSource)
      ) {
        return current;
      }
      const nextSnapshot = { status: nextStatus, value: nextValue as T, source: nextSource };
      snapshotRef.current = nextSnapshot;
      return nextSnapshot;
    },
  );

  return { value: snapshot.value as T, status: snapshot.status, source: snapshot.source };
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
