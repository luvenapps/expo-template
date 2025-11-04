import { QueryClient } from '@tanstack/react-query';
import type { PersistQueryClientProviderProps } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { Platform } from 'react-native';
import { get as idbGet, set as idbSet, del as idbDelete } from 'idb-keyval';

const TWENTY_FOUR_HOURS = 1000 * 60 * 60 * 24;

let queryClient: QueryClient | null = null;
let persistOptions: PersistQueryClientProviderProps['persistOptions'] | null | undefined;

export function getQueryClient() {
  if (!queryClient) {
    queryClient = new QueryClient();
  }

  return queryClient;
}

export function resetQueryClient() {
  queryClient = null;
  persistOptions = undefined;
}

function isWeb() {
  return Platform.OS === 'web' && typeof window !== 'undefined';
}

export function getQueryClientPersistOptions():
  | PersistQueryClientProviderProps['persistOptions']
  | null {
  if (!isWeb()) {
    persistOptions = null;
    return null;
  }

  if (persistOptions !== undefined) {
    return persistOptions;
  }

  const persister = createAsyncStoragePersister({
    storage: {
      getItem: (key) => idbGet(key),
      setItem: (key, value) => idbSet(key, value),
      removeItem: (key) => idbDelete(key),
    },
  });

  persistOptions = {
    persister,
    maxAge: TWENTY_FOUR_HOURS,
    dehydrateOptions: {
      shouldDehydrateQuery: () => true,
    },
  };

  return persistOptions;
}
