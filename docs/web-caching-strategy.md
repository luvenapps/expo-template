# Web Caching Strategy

## Current State

**Problem**: The web platform currently makes direct Supabase queries without any caching layer, resulting in:

- ❌ Every render fetches fresh data from the server
- ❌ No offline support
- ❌ Slower perceived performance
- ❌ Unnecessary network requests
- ❌ Poor UX compared to native platforms

**Infrastructure**: React Query (@tanstack/react-query) is already installed and configured ([src/state/queryClient.ts](../src/state/queryClient.ts)) but not yet used for data fetching.

## Goal

Implement a progressive caching strategy for web that provides:

1. **Phase 1**: In-memory caching with React Query
2. **Phase 2**: Persistent cache with IndexedDB
3. **Phase 3**: Full offline support with service workers

## Architecture Comparison

| Platform          | Storage                    | Caching     | Offline         |
| ----------------- | -------------------------- | ----------- | --------------- |
| **iOS/Android**   | SQLite + Supabase sync     | Native      | ✅ Full         |
| **Web (current)** | Direct Supabase queries    | None        | ❌ None         |
| **Web (target)**  | Supabase + IndexedDB cache | React Query | ✅ Basic → Full |

## Implementation Plan

### Phase 1: React Query Integration (In-Memory Cache)

**Goal**: Replace direct Supabase calls with React Query hooks for automatic caching.

**Benefits**:

- ✅ Automatic in-memory caching
- ✅ Background refetching
- ✅ Optimistic updates
- ✅ Request deduplication
- ✅ Loading/error states

**Example**:

```typescript
// Before (direct query - no caching):
async function loadHabits(userId: string) {
  const { data } = await supabase.from('habits').select('*').eq('user_id', userId);
  return data;
}

// After (React Query - automatic caching):
function useHabits(userId: string) {
  return useQuery({
    queryKey: ['habits', userId],
    queryFn: async () => {
      const { data, error } = await supabase.from('habits').select('*').eq('user_id', userId);
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
```

**Tasks**:

- [ ] Create React Query hooks for all Supabase queries
  - [ ] `useHabits()` - fetch user's habits
  - [ ] `useHabitEntries()` - fetch entries for a habit
  - [ ] `useReminders()` - fetch reminders
  - [ ] `useDevices()` - fetch user's devices
- [ ] Create mutation hooks for all write operations
  - [ ] `useCreateHabit()`
  - [ ] `useUpdateHabit()`
  - [ ] `useDeleteHabit()`
  - [ ] Similar for entries, reminders, devices
- [ ] Configure query invalidation on mutations
- [ ] Add optimistic updates for better UX
- [ ] Test on web platform

**Files to create/modify**:

- `src/queries/habits.ts` - Habit queries and mutations
- `src/queries/entries.ts` - Entry queries and mutations
- `src/queries/reminders.ts` - Reminder queries and mutations
- `src/queries/devices.ts` - Device queries and mutations
- Update components to use hooks instead of direct queries

### Phase 2: Persistent Cache (IndexedDB)

**Goal**: Persist React Query cache to IndexedDB so data survives page refreshes.

**Benefits**:

- ✅ Instant app loads (no loading spinners on refresh)
- ✅ Works offline temporarily (until cache expires)
- ✅ Better UX - feels native

**Dependencies**:

```bash
npm install @tanstack/query-sync-storage-persister
npm install idb-keyval
```

**Implementation**:

```typescript
// src/state/queryClient.ts
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { get, set, del } from 'idb-keyval';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
    },
  },
});

const persister = createSyncStoragePersister({
  storage: {
    getItem: async (key) => get(key),
    setItem: async (key, value) => set(key, value),
    removeItem: async (key) => del(key),
  },
});

// Wrap app with PersistQueryClientProvider
```

**Tasks**:

- [ ] Install persister dependencies
- [ ] Configure IndexedDB storage adapter
- [ ] Set appropriate cache times (gcTime, staleTime)
- [ ] Test cache persistence across page refreshes
- [ ] Add cache invalidation on auth changes
- [ ] Handle cache versioning for schema updates

**Files to modify**:

- `src/state/queryClient.ts` - Add persister configuration
- `src/ui/providers/AppProviders.tsx` - Wrap with PersistQueryClientProvider
- `package.json` - Add dependencies

### Phase 3: Full Offline Support (Service Workers)

**Goal**: Make web work fully offline with background sync when online.

**Benefits**:

- ✅ Full offline support (like native)
- ✅ Background sync when connection restored
- ✅ Progressive Web App (PWA) capabilities
- ✅ Push notifications

**Implementation**:

```typescript
// public/service-worker.js
// Cache strategy: Network first, fall back to cache
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone response and cache it
          const responseClone = response.clone();
          caches.open('api-cache').then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(event.request);
        }),
    );
  }
});

// Background sync for pending mutations
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-habits') {
    event.waitUntil(syncPendingMutations());
  }
});
```

**Tasks**:

- [ ] Implement service worker for API caching
- [ ] Add background sync for pending mutations
- [ ] Create offline queue for write operations
- [ ] Handle conflict resolution on sync
- [ ] Add PWA manifest
- [ ] Test full offline → online flow
- [ ] Add offline indicator in UI

**Files to create**:

- `public/service-worker.js` - Service worker logic
- `public/manifest.json` - PWA manifest
- `src/offline/queue.ts` - Offline mutation queue
- `src/offline/sync.ts` - Background sync handler

## Testing Strategy

### Phase 1 Tests

- [ ] Queries return cached data on subsequent calls
- [ ] Cache invalidation works after mutations
- [ ] Optimistic updates work correctly
- [ ] Error handling works (network failures)

### Phase 2 Tests

- [ ] Cache persists across page refreshes
- [ ] Cache clears on logout
- [ ] Cache invalidates on schema version changes

### Phase 3 Tests

- [ ] App works fully offline
- [ ] Mutations queue when offline
- [ ] Sync happens when back online
- [ ] Conflicts resolve correctly

## Rollout Plan

1. **Phase 1**: Ship React Query integration (in-memory only)
   - Low risk, immediate performance improvement
   - Can roll back easily if issues

2. **Phase 2**: Enable IndexedDB persistence
   - Feature flag for gradual rollout
   - Monitor cache hit rates

3. **Phase 3**: Add service worker and offline support
   - Optional PWA features
   - Full offline mode for power users

## Success Metrics

- **Performance**:
  - Reduce average page load time by 50%
  - Cache hit rate > 80%

- **User Experience**:
  - Zero loading spinners on subsequent visits
  - Instant UI responses (optimistic updates)

- **Offline Support**:
  - App usable offline for > 80% of common tasks
  - Successful sync rate > 95% when online

## Migration Notes

- React Query is additive - no breaking changes
- Can migrate queries incrementally (one at a time)
- IndexedDB has good browser support (>95%)
- Service Workers require HTTPS (works on localhost)

## Related Docs

- [React Query Documentation](https://tanstack.com/query/latest/docs/react/overview)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Database Migrations](./database-migrations.md)
- [Sync Infrastructure](../src/sync/README.md)
