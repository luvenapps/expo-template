# Comprehensive Logging & Observability System

## Overview

This document outlines the implementation plan for a production-grade, pluggable logging system that:

- Replaces 90+ console.log statements across the codebase
- Provides unified API for logging, analytics, error reporting, and performance tracing
- Supports multiple backends (Firebase Crashlytics/Analytics/Performance, Supabase, Sentry, Amplitude)
- Environment-aware (verbose in dev, sampled/remote in prod)
- Future-proof with easy backend swapping

## Current State

**Existing observability infrastructure:**

- ✅ `AnalyticsProvider` with `trackEvent()`, `trackError()`, `trackPerformance()` (React Context)
- ✅ `firebaseBackend.ts` - Firebase Analytics integration (native + web)
- ✅ Firebase Crashlytics installed (`@react-native-firebase/crashlytics`) - NOT integrated
- ✅ Firebase Performance installed (`@react-native-firebase/perf`) - NOT integrated
- ✅ Firebase In-App Messaging integrated
- ✅ `__DEV__` flag for dev/prod switching
- ❌ No unified logging API - scattered console.log statements
- ❌ No app log persistence (Supabase or backend)
- ❌ No performance tracing helpers
- ❌ No error reporter facade

**Console.log statements:**

- `src/notifications/firebasePush.ts`: 30 statements
- `src/notifications/useNotificationSettings.ts`: 4 statements
- `app/(tabs)/settings/index.tsx`: 6 statements
- Other files: ~50+ statements (auth, sync, db, observability)
- `public/firebase-messaging-sw.js`: 5 statements - SKIP (service worker context)

**Total: 90+ statements** (prioritize 40 notification logs first)

## Architecture Overview

### Logging vs Observability (Intentional Split)

- **Logging** explains _what happened_ and _why_ during debugging (developer-facing, operational detail).
- **Observability** measures _system health_ via structured events/errors/perf metrics.

In practice:

- Use `logger.debug/info/warn/error` for **logging**.
- Use `analytics.trackEvent/trackError/trackPerformance` (or `useAnalytics()`) for **observability**.

### 1. Central Logger API

**Single entry point** for **logging** in the service layer (non-React code):

```typescript
import { createLogger } from '@/observability/logger';
import { analytics } from '@/observability/analytics';

const logger = createLogger('FCM'); // Namespace-based

// 1. Application logs (console + optional remote persistence)
logger.debug('Token registered:', token); // Dev only
logger.info('Foreground message received'); // Dev only
logger.warn('Permission denied'); // Dev + prod console
logger.error('Failed to initialize', error); // Always shown

// 2. Observability (events/errors/perf)
analytics.trackError(error, { context: 'FCM init', userId: '123' });

// 3. Analytics events (Firebase Analytics, Amplitude, etc.)
analytics.trackEvent('push_token_registered', { platform: 'ios' });

// 4. Performance tracing
const result = await analytics.traceAsync('fcm_initialization', async () => {
  return await initializeFCM();
});
```

**Relationship to existing `AnalyticsProvider`**:

The logger is designed to **coexist** with the existing `AnalyticsProvider`:

- **`AnalyticsProvider` (React Context)**: For UI layer analytics in React components (thin wrapper over the same analytics helper)

  ```typescript
  // In React components
  const analytics = useAnalytics();
  analytics.trackEvent('button_clicked', { screen: 'settings' });
  analytics.trackError(error, { context: 'form_submit' });
  analytics.trackPerformance('render_time', 150);
  ```

- **`Logger` (Service utility)**: For service layer logging in non-React code
  ```typescript
  // In services, utilities, background tasks
  const logger = createLogger('Sync');
  logger.info('Sync finished', { recordCount: 50 });
  analytics.trackEvent('sync_completed', { recordCount: 50 });
  analytics.trackError(error, { context: 'outbox_processing' });
  analytics.traceAsync('fetch_remote_data', fetchFn);
  ```

Both systems will **share the same Firebase Analytics backend** (refactored from `firebaseBackend.ts`), ensuring all events go to the same destination when enabled.

**Important**: Both respect the `EXPO_PUBLIC_TURN_ON_FIREBASE` flag:

- When `EXPO_PUBLIC_TURN_ON_FIREBASE=false` (default in dev): Neither sends to Firebase Analytics
- When `EXPO_PUBLIC_TURN_ON_FIREBASE=true` (production or testing): Both send to Firebase Analytics

This gives you:

- ✅ Clean React hooks for UI events (`useAnalytics()`)
- ✅ Flexible logger for service-layer events (`createLogger()`)
- ✅ Single Firebase Analytics implementation (no duplication)
- ✅ Consistent Firebase enablement via single flag

### 2. Pluggable Backend Architecture

**Backend Interfaces** (`src/observability/backends/types.ts`):

```typescript
// Error Reporter Backend
export interface ErrorReporterBackend {
  recordError(error: Error, context?: Record<string, unknown>): void;
  setUserIdentifier(userId: string): void;
  logBreadcrumb(message: string, data?: Record<string, unknown>): void;
}

// Analytics Backend
export interface AnalyticsBackend {
  logEvent(name: string, params?: Record<string, unknown>): void;
  setUserId(userId: string): void;
  setUserProperty(name: string, value: string): void;
}

// App Logs Backend
export interface AppLogsBackend {
  sendLog(log: AppLogEntry): Promise<void>;
  sendBatch(logs: AppLogEntry[]): Promise<void>;
}

// Performance Backend
export interface PerformanceBackend {
  startTrace(name: string): PerformanceTrace;
  recordTrace(
    name: string,
    durationMs: number,
    metadata?: Record<string, unknown>
  ): void;
}

export interface PerformanceTrace {
  stop(): void;
  putMetric(name: string, value: number): void;
  putAttribute(name: string, value: string): void;
}
```

**Concrete Implementations**:

1. **Firebase Crashlytics** (`backends/crashlyticsBackend.ts`)

   ```typescript
   import crashlytics from '@react-native-firebase/crashlytics';

   export class CrashlyticsBackend implements ErrorReporterBackend {
     recordError(error: Error, context?: Record<string, unknown>): void {
       if (context) {
         Object.entries(context).forEach(([key, value]) => {
           crashlytics().setAttribute(key, String(value));
         });
       }
       crashlytics().recordError(error);
     }

     setUserIdentifier(userId: string): void {
       crashlytics().setUserId(userId);
     }

     logBreadcrumb(message: string, data?: Record<string, unknown>): void {
       crashlytics().log(`${message} ${JSON.stringify(data || {})}`);
     }
   }
   ```

2. **Firebase Analytics** (`backends/firebaseAnalyticsBackend.ts`)
   - Already exists in `firebaseBackend.ts`
   - Refactor into `AnalyticsBackend` interface
   - Native + web support

3. **Supabase App Logs** (`backends/supabaseAppLogsBackend.ts`)

   ```typescript
   export class SupabaseAppLogsBackend implements AppLogsBackend {
     private queue: AppLogEntry[] = [];
     private batchSize = 50;
     private flushInterval = 30000; // 30 seconds

     async sendLog(log: AppLogEntry): Promise<void> {
       this.queue.push(log);
       if (this.queue.length >= this.batchSize) {
         await this.flush();
       }
     }

     async sendBatch(logs: AppLogEntry[]): Promise<void> {
       const { error } = await supabase.from('app_logs').insert(logs);
       if (error) console.warn('[AppLogs] Failed to send batch:', error);
     }

     private async flush() {
       if (this.queue.length === 0) return;
       const batch = this.queue.splice(0, this.batchSize);
       await this.sendBatch(batch);
     }
   }
   ```

4. **Firebase Performance** (`backends/firebasePerformanceBackend.ts`)

   ```typescript
   import perf from '@react-native-firebase/perf';

   export class FirebasePerformanceBackend implements PerformanceBackend {
     startTrace(name: string): PerformanceTrace {
       const trace = perf().newTrace(name);
       trace.start();
       return {
         stop: () => trace.stop(),
         putMetric: (name, value) => trace.putMetric(name, value),
         putAttribute: (name, value) => trace.putAttribute(name, value),
       };
     }

     recordTrace(
       name: string,
       durationMs: number,
       metadata?: Record<string, unknown>
     ): void {
       // Custom metric recording
       perf().putMetric(name, durationMs);
     }
   }
   ```

**Future backends** (easy to add):

- `SentryBackend` for error reporting
- `AmplitudeBackend` for analytics
- `DataDogBackend` for app logs
- `NewRelicBackend` for performance

### 3. Environment-Aware Behavior

All logger methods follow a consistent pattern: **always log to console in dev, optionally send to backends based on configuration**.

**Development (`__DEV__ === true`)**:

_Default behavior (no flags set):_

- ✅ **Logger methods log to console** (`logger.debug/info/warn/error`)
- ❌ **NO backend calls** (logging + analytics backends disabled)
- **Purpose**: Fast, verbose, local-only debugging with full visibility

_With Firebase enabled (`EXPO_PUBLIC_TURN_ON_FIREBASE=true`):_

- ✅ **Logger methods log to console** (full visibility)
- ✅ **Firebase backends active** (Analytics, Crashlytics, Performance - all free tiers)
- ❌ **Supabase disabled** (unless enabled in configuration)
- **Purpose**: Test Firebase integration, validate event schemas

_With Supabase enabled:_

- ✅ **Logger methods log to console** (full visibility)
- ✅ **Supabase active** (sends to local Supabase instance via `npm run supabase:dev`)
- ❌ **Firebase disabled** (unless `EXPO_PUBLIC_TURN_ON_FIREBASE=true`)
- **Purpose**: Test Supabase app logs, query logs locally via Supabase Studio
- **Note**: Uses `.env.local` credentials (local Docker), not production

_Full stack testing (both flags set):_

- ✅ **Logger methods log to console**
- ✅ **Firebase backends active**
- ✅ **Supabase active** (local Docker)
- **Purpose**: Test complete observability pipeline end-to-end

**Production (`__DEV__ === false`)**:

- ⚠️ **Console output**: Only warn/error logs (debug/info suppressed to reduce noise)
- ✅ **Backend calls**: All methods send to their respective backends (when enabled)
  - Error reporting to Crashlytics (100% sampling, requires `EXPO_PUBLIC_TURN_ON_FIREBASE=true`)
  - Analytics events to Firebase Analytics (100%, requires `EXPO_PUBLIC_TURN_ON_FIREBASE=true`)
  - App logs to Supabase (10% sampling, batched)
  - Performance traces (5% sampling, requires `EXPO_PUBLIC_TURN_ON_FIREBASE=true`)
- **Purpose**: Remote monitoring, low overhead, cost-effective

**Configuration Summary**:

| Environment         | `EXPO_PUBLIC_TURN_ON_FIREBASE` | Console    | Firebase | Supabase         |
| ------------------- | ------------------------------ | ---------- | -------- | ---------------- |
| Dev (default)       | `false`                        | All        | ❌       | ❌               |
| Dev (Firebase only) | `true`                         | All        | ✅ Free  | ❌               |
| Dev (Supabase only) | `false`                        | All        | ❌       | ✅ Local         |
| Dev (full stack)    | `true`                         | All        | ✅ Free  | ✅ Local         |
| Prod                | `true`                         | Warn/Error | ✅       | ✅ (10% sampled) |

**Runtime Debug Toggle** (deep link or global helper):

- ✅ All logs to console (debug/info/warn/error) once enabled
- ✅ All production backends still active
- **Purpose**: Diagnose production-only issues without rebuilding
- **Deep links**:
  - Native: `youdomain://debug-logs?enabled=true` (or `false` to disable)
  - Web: `https://<host>/?debug-logs=true` (or `false`)
- **Global helper** (in the console): `globalThis.__SET_DEBUG_LOGS__(true|false)`
- **Persistence**: Stored in localStorage (web) and MMKV (native)

**Mobile Log Viewing**

- **iOS (device)**: Xcode → Window → Devices and Simulators → select device → **Open Console**. Use search to filter (e.g., `PermSync`, `FCM`, `Observability`).
- **Android (device)**: Connect via USB and run:

```bash
adb logcat | grep -i "youdomain\\|PermSync\\|FCM\\|Observability"
```

**Environment Flags**:

- `EXPO_PUBLIC_TURN_ON_FIREBASE` - Controls Firebase backends (Analytics, Crashlytics, Performance)

**Batching Configuration**:

```typescript
// src/config/constants.ts
export const OBSERVABILITY = {
  production: {
    errorReporting: {
      enabled: true,
    },
    analytics: {
      enabled: true,
    },
    appLogs: {
      enabled: true,
      batchSize: 50, // Batch 50 logs
      flushIntervalMs: 30000, // Flush every 30s
    },
    performance: {
      enabled: true,
    },
  },
  development: {
    // All disabled except console logging
    errorReporting: { enabled: false },
    analytics: { enabled: false },
    appLogs: { enabled: false, batchSize: 50, flushIntervalMs: 30000 },
    performance: { enabled: false },
  },
};
```

## Implementation Plan

### Phase 1: Logger Core & Interfaces (2-3 hours)

**1.1 Create backend interfaces** (`src/observability/backends/types.ts`)

- Define `ErrorReporterBackend`, `AnalyticsBackend`, `AppLogsBackend`, `PerformanceBackend`
- Define `AppLogEntry`, `PerformanceTrace` types
- Export common types

**1.2 Add configuration** (`src/config/constants.ts`)

- Add `OBSERVABILITY` config object with prod/dev settings
- Sampling rates, batch sizes, flush intervals
- Keep all app configuration centralized

**1.3 Create logger core** (`src/observability/logger.ts`)

See the complete implementation in the plan file at `/Users/hichamelhammouchi/.claude/plans/goofy-floating-phoenix.md` (lines 285-505) for the full `createLogger` implementation.

**Key features**:

- Namespace-based logger instances
- Lazy-loaded backends (only in production)
- Platform-aware backend selection
- Sampling and batching support
- Graceful degradation if backends fail

### Phase 2: Backend Implementations (2-3 hours)

**2.1 Implement Firebase Crashlytics backend** (`src/observability/backends/crashlyticsBackend.ts`)

- Implement `ErrorReporterBackend` interface
- Use `@react-native-firebase/crashlytics`
- Native only (iOS/Android)
- Add breadcrumb support

**2.2 Refactor Firebase Analytics backend** (`src/observability/backends/firebaseAnalyticsBackend.ts`)

- Extract core Firebase Analytics logic from `firebaseBackend.ts` into a shared module
- Implement `AnalyticsBackend` interface for logger
- Keep native + web support
- **Important**: `AnalyticsProvider` will continue using this same backend
- Both logger and `AnalyticsProvider` share the Firebase Analytics implementation
- No duplication - single source of truth for Firebase Analytics calls

**2.3 Implement Supabase App Logs backend** (`src/observability/backends/supabaseAppLogsBackend.ts`)

- Implement `AppLogsBackend` interface
- Batching logic (50 logs or 30s)
- Sampling support (10% in prod)
- Create Supabase migration for `app_logs` table

**2.4 Implement Firebase Performance backend** (`src/observability/backends/firebasePerformanceBackend.ts`)

- Implement `PerformanceBackend` interface
- Use `@react-native-firebase/perf`
- Native only (iOS/Android)

### Phase 3: Database Schema (30 minutes)

**3.1 Create Supabase migration** (`supabase/migrations/YYYYMMDDHHMMSS_create_app_logs.sql`)

```sql
-- App logs table for remote log persistence
CREATE TABLE IF NOT EXISTS app_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace TEXT NOT NULL,
  event_name TEXT NOT NULL,
  data JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  platform TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_app_logs_namespace ON app_logs(namespace);
CREATE INDEX IF NOT EXISTS idx_app_logs_event_name ON app_logs(event_name);
CREATE INDEX IF NOT EXISTS idx_app_logs_timestamp ON app_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_app_logs_user_id ON app_logs(user_id);

-- Row-level security
ALTER TABLE app_logs ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can insert their own logs
CREATE POLICY "Users can insert their own logs"
  ON app_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can read all logs
CREATE POLICY "Admins can read all logs"
  ON app_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );
```

### Phase 4: Migration (3-4 hours)

**4.1 Replace notification logs (40 statements) - Priority 1**

- `src/notifications/firebasePush.ts`: 30 statements

  ```typescript
  const logger = createLogger('FCM');
  const webLogger = createLogger('FCM:web');

  // Before: console.log('[FCM] Token registered:', token);
  // After: logger.info('Token registered:', token);
  ```

- `src/notifications/useNotificationSettings.ts`: 4 statements
- `app/(tabs)/settings/index.tsx`: 6 notification-related statements

**4.2 Replace observability logs (15 statements) - Priority 2**

- `src/observability/AnalyticsProvider.tsx`
- `src/observability/firebaseBackend.ts`

**4.3 Replace auth/sync/db logs (35+ statements) - Priority 3**

- `src/auth/session.ts`
- `src/sync/engine.ts`, `src/sync/useSyncTask.ts`
- `src/db/sqlite/retry.ts`, `src/db/sqlite/repository.ts`

**4.4 Skip service worker** (`public/firebase-messaging-sw.js`)

- Keep 5 console.log statements as-is
- Service worker context incompatible with React modules

### Phase 5: Testing (2-3 hours)

**5.1 Unit tests** (`__tests__/src/observability/logger.test.ts`)

```typescript
import { createLogger } from '@/observability/logger';

describe('Logger', () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs debug messages in development', () => {
    (global as any).__DEV__ = true;
    const logger = createLogger('Test');
    logger.debug('test message');
    expect(consoleLogSpy).toHaveBeenCalledWith('[Test]', 'test message');
  });

  it('suppresses debug messages in production', () => {
    (global as any).__DEV__ = false;
    const logger = createLogger('Test');
    logger.debug('test message');
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it('reports errors to Crashlytics in production', () => {
    // Mock Crashlytics backend and verify error reporting
  });
});
```

**5.2 Backend tests**

- `__tests__/src/observability/backends/crashlyticsBackend.test.ts`
- `__tests__/src/observability/backends/firebaseAnalyticsBackend.test.ts`
- `__tests__/src/observability/backends/supabaseAppLogsBackend.test.ts`
- `__tests__/src/observability/backends/firebasePerformanceBackend.test.ts`

**5.3 Integration tests**

- Mock all backends in `__tests__/setup.ts`
- Verify logger doesn't break existing tests
- Verify environment-aware behavior

**5.4 Manual testing**

- Dev build: Verify all logs appear in console
- Prod build: Verify debug/info suppressed
- Prod build: Verify errors appear in Crashlytics
- Prod build: Verify events appear in Firebase Analytics
- Prod build: Verify logs saved to Supabase `app_logs` table

### Phase 6: Documentation (1 hour)

**6.1 Update this file (`docs/logging.md`)**

- API reference for all logger methods
- Backend configuration examples
- Migration patterns for different file types
- Troubleshooting common issues

**6.2 Update `docs/observability.md`**

- Add logger section
- Document backend configuration
- Explain sampling and batching

**6.3 Update `README.md`**

- Quick start guide for logger
- Example usage

## Critical Files

| File                                                       | Action | Lines Changed | Reason                           |
| ---------------------------------------------------------- | ------ | ------------- | -------------------------------- |
| `src/observability/backends/types.ts`                      | CREATE | ~100          | Backend interface definitions    |
| `src/observability/backends/crashlyticsBackend.ts`         | CREATE | ~50           | Crashlytics integration          |
| `src/observability/backends/firebaseAnalyticsBackend.ts`   | CREATE | ~80           | Analytics integration (refactor) |
| `src/observability/backends/supabaseAppLogsBackend.ts`     | CREATE | ~100          | App logs persistence             |
| `src/observability/backends/firebasePerformanceBackend.ts` | CREATE | ~60           | Performance tracing              |
| `src/observability/logger.ts`                              | CREATE | ~250          | Central logger API               |
| `src/observability/config.ts`                              | CREATE | ~50           | Observability configuration      |
| `src/notifications/firebasePush.ts`                        | UPDATE | 30 logs       | Replace console.log              |
| `src/notifications/useNotificationSettings.ts`             | UPDATE | 4 logs        | Replace console.log              |
| `app/(tabs)/settings/index.tsx`                            | UPDATE | 6 logs        | Replace console.log              |
| `supabase/migrations/YYYYMMDDHHMMSS_create_app_logs.sql`   | CREATE | ~50           | App logs table                   |
| `__tests__/src/observability/logger.test.ts`               | CREATE | ~150          | Unit tests                       |
| `__tests__/src/observability/backends/*.test.ts`           | CREATE | ~200          | Backend tests                    |
| `__tests__/setup.ts`                                       | UPDATE | ~20           | Mock logger                      |
| `docs/logging.md`                                          | UPDATE | ~500          | This documentation               |

## Success Criteria

- ✅ Logger utility created with namespace-based API
- ✅ All backend interfaces defined and implemented
- ✅ Firebase Crashlytics integrated for error reporting
- ✅ Firebase Analytics refactored into backend interface
- ✅ Supabase app logs backend implemented with batching
- ✅ Firebase Performance integrated for tracing
- ✅ 40 notification console.logs replaced (priority 1)
- ✅ 90+ total console.logs replaced (all files)
- ✅ Service worker logs unchanged (incompatible context)
- ✅ All tests pass (1059+ tests)
- ✅ Dev builds show all logs in console
- ✅ Prod builds suppress debug/info, send to backends
- ✅ Sampling and batching working correctly
- ✅ Zero production performance overhead
- ✅ Documentation complete

## Testing Checklist

- [ ] Logger utility created with correct API
- [ ] All backend interfaces implemented
- [ ] Crashlytics records errors in production
- [ ] Firebase Analytics tracks events in production
- [ ] Supabase app logs table populated (10% sampling)
- [ ] Firebase Performance traces recorded (5% sampling)
- [ ] All debug/info logs suppressed in production
- [ ] Warn/error logs appear in console (dev + prod)
- [ ] Debug toggle works (deep link or `__SET_DEBUG_LOGS__`)
- [ ] All 1059+ tests pass
- [ ] No ESLint errors
- [ ] Type checking passes
- [ ] Service worker logs unchanged
- [ ] No console.error in production (except actual errors)
- [ ] Batching works (50 logs or 30s flush)
- [ ] Sampling works (10% app logs, 5% traces)

## Estimated Effort

- Phase 1 (Core Infrastructure): 2-3 hours
- Phase 2 (Central Logger API): 2-3 hours
- Phase 3 (Database Schema): 30 minutes
- Phase 4 (Migration): 3-4 hours
- Phase 5 (Testing): 2-3 hours
- Phase 6 (Documentation): 1 hour

**Total: 11-15 hours** (1.5-2 days of focused work)

## Future Enhancements

### Additional Backends (Future)

- **Sentry** (`backends/sentryBackend.ts`) - Alternative error reporting
- **Amplitude** (`backends/amplitudeBackend.ts`) - Alternative analytics
- **DataDog** (`backends/datadogBackend.ts`) - Alternative app logs
- **New Relic** (`backends/newRelicBackend.ts`) - Alternative performance

### Advanced Features (Future)

- **Log search UI** - Admin dashboard to query `app_logs` table
- **Error aggregation** - Group similar errors in Crashlytics/Sentry
- **Performance dashboards** - Visualize trace data in Firebase
- **Alert rules** - Notify on error spikes or performance degradation
- **Log retention policies** - Auto-delete old app logs after 90 days

## Notes

- **Service worker incompatible**: Keep `public/firebase-messaging-sw.js` logs as-is (5 statements)
- **Lazy loading**: Backends loaded only when needed (avoid startup cost)
- **Platform-aware**: Native backends (Crashlytics, Performance) only on iOS/Android
- **Graceful degradation**: Logger works even if backends fail to initialize
- **Sampling**: Reduces costs and overhead (10% app logs, 5% traces in prod)
- **Batching**: Reduces network calls (50 logs per batch, 30s flush interval)
- **Debug toggle**: Deep link or `__SET_DEBUG_LOGS__` enables console logs in production
- **Firebase flag**: Existing `EXPO_PUBLIC_TURN_ON_FIREBASE` controls all Firebase backends

## API Reference

### createLogger(namespace: string): Logger

Creates a namespaced logger instance.

**Parameters:**

- `namespace` - Prefix for all log messages (e.g., 'FCM', 'Auth', 'Sync')

**Returns:** Logger instance with all methods

**Example:**

```typescript
const logger = createLogger('Auth');
logger.info('User logged in:', userId);
```

### Logger Methods

#### debug(message: string, ...args: unknown[]): void

Logs debug-level messages. Only shown in development.

**Example:**

```typescript
logger.debug('Processing token:', token, { metadata });
```

#### info(message: string, ...args: unknown[]): void

Logs informational messages. Only shown in development.

**Example:**

```typescript
logger.info('Sync completed successfully');
```

#### warn(message: string, ...args: unknown[]): void

Logs warning messages. Shown in development and production.

**Example:**

```typescript
logger.warn('Rate limit approaching', { remaining: 10 });
```

#### error(message: string, error?: Error | unknown, metadata?: Record<string, unknown>): void

Logs errors. Always shown in console, reported to Crashlytics in production.

**Example:**

```typescript
logger.error('Failed to sync', error, { userId, attemptCount: 3 });
```

### Analytics Helper (Service Layer)

Use the service-layer analytics helper for observability (events/errors/perf) outside React.

```typescript
import { analytics } from '@/observability/analytics';

analytics.trackEvent('push_enabled', { platform: 'ios', method: 'settings' });
analytics.trackError(error, { context: 'sync', userId });
analytics.trackPerformance({ name: 'sync_pull', durationMs: 420 });

const data = await analytics.traceAsync('fetch_user_data', async () => {
  return await fetchUserData(userId);
});
```

## Current Analytics Event Inventory

This list reflects the **current** `trackEvent` and `trackError` call sites in code.

### Events (trackEvent)

- `auth:sign_in` (payload: `method`, `status`, `code?`, `platform`)
- `auth:sign_up` (payload: `method`, `status`, `code?`, `platform`)
- `auth:forgot_password` (payload: `method`, `status`, `code?`, `platform`)
- `auth:sign_out` (payload: `method`, `status`, `code?`, `platform`)
- `iam:displayed`
- `iam:dismissed`
- `iam:clicked`
- `language:changed` (payload: `from`, `to`, `platform`)
- `theme:changed` (payload: `from`, `to`, `platform`)
- `notifications:permission-requested` (payload: `platform`, `statusBefore`, `granted`)
- `notifications:prompt-triggered` (payload: `platform`, `context`)
- `notifications:push-disabled` (payload: `status`)
- `notifications:foreground-fired` (payload: `platform`, `reminderId`, `itemId?`)
- `notification:foreground:displayed` (payload: `platform`, `timestamp`, `title?`, `tag?`, `route?`) **web only**
- `notification:foreground:clicked` (payload: `platform`, `timestamp`, `title?`, `tag?`, `route?`) **web only**
- `notification:foreground:dismissed` (payload: `platform`, `timestamp`, `title?`, `tag?`, `route?`) **web only**
- `reminders:sent` (payload: `platform`, `reminderId`, `notificationId`, `fireDate`, `route`, `source`)
- `reminders:clicked` (payload: `platform`, `reminderId`, `notificationId?`, `route?`, `source`)
- `reminders:created` (payload: `platform`, `reminderId`, `primaryId`, `isEnabled`, `source`)
- `reminders:updated` (payload: `platform`, `reminderId`, `primaryId`, `isEnabled`, `source`)
- `reminders:disabled` (payload: `platform`, `reminderId`, `primaryId`, `isEnabled`, `source`)
- `reminders:deleted` (payload: `platform`, `reminderId`, `primaryId`, `source`)

### Errors (trackError)

Errors are tracked with a `source` string for analytics filtering:

- `notifications:permissions`
- `notifications:permission-sync`
- `notifications:auto-soft`

### Performance (trackPerformance)

No explicit call sites yet outside `analyticsCore` helpers.

## Integration Guidelines

### When to Use Logger vs AnalyticsProvider

**Rule of thumb**: Logging is operational detail (`logger.debug/info/warn/error`); observability is metrics (`trackEvent/trackError/trackPerformance`).

**Use `AnalyticsProvider` (React Context)** for:

- ✅ UI component analytics (button clicks, screen views, form submissions)
- ✅ User interaction tracking
- ✅ React component lifecycle events
- ✅ Any code inside React components/hooks

**Use `Logger` (Service utility)** for:

- ✅ Service layer operations (FCM, sync, auth, database)
- ✅ Background tasks and workers
- ✅ Utility functions and helpers
- ✅ Error reporting from non-React code
- ✅ Performance tracing for async operations

**Example:**

```typescript
// ❌ DON'T use logger in React components - use AnalyticsProvider
function SettingsScreen() {
  const logger = createLogger('Settings'); // ❌ Wrong
  const analytics = useAnalytics(); // ✅ Correct

  const handleToggle = () => {
    analytics.trackEvent('toggle_pushed'); // ✅ Correct
  };
}

// ✅ DO use logger in service layer
export async function registerForPush() {
  const logger = createLogger('FCM');
  const analytics = require('@/observability/analytics').analytics;

  try {
    const token = await getToken();
    logger.info('Token registered:', token);
    analytics.trackEvent('push_token_registered', { platform: 'ios' });
    return { status: 'success', token };
  } catch (error) {
    analytics.trackError(error, { context: 'token_registration' });
    return { status: 'error' };
  }
}
```

## Migration Patterns

### Pattern 1: Simple Console Log Replacement

**Before:**

```typescript
console.log('[FCM] Token registered:', token);
```

**After:**

```typescript
const logger = createLogger('FCM');
logger.info('Token registered:', token);
```

### Pattern 2: Error Logging

**Before:**

```typescript
console.error('[Sync] Failed to sync:', error);
```

**After:**

```typescript
const logger = createLogger('Sync');
logger.error('Failed to sync', error);
```

### Pattern 3: Debug Logging with Objects

**Before:**

```typescript
console.log('[Auth] User state:', { uid, email, status });
```

**After:**

```typescript
const logger = createLogger('Auth');
logger.debug('User state:', { uid, email, status });
```

### Pattern 4: Conditional Logging

**Before:**

```typescript
if (__DEV__) {
  console.log('[DB] Query executed:', query);
}
```

**After:**

```typescript
const logger = createLogger('DB');
logger.debug('Query executed:', query); // Automatically dev-only
```

### Pattern 5: Analytics + Logging

**Before:**

```typescript
console.log('[User] Feature used:', featureName);
analytics.trackEvent('feature_used', { feature: featureName });
```

**After:**

```typescript
const logger = createLogger('User');
logger.info('Feature used:', featureName);
analytics.trackEvent('feature_used', { feature: featureName });
```

## Troubleshooting

### Logs not appearing in production

**Issue**: Debug/info logs not showing in production builds.

**Solution**: This is expected behavior. Enable logs via deep link (`debug-logs?enabled=true`) or `globalThis.__SET_DEBUG_LOGS__(true)` while debugging.

### Errors not appearing in Crashlytics

**Checklist**:

1. Verify Firebase is enabled: `EXPO_PUBLIC_TURN_ON_FIREBASE=true`
2. Verify Firebase credentials configured correctly
3. Rebuild app with `npx expo prebuild --clean`
4. Check Crashlytics dashboard (may take 5-10 minutes to appear)
5. Verify error is thrown in production build (not dev)

### App logs not appearing in Supabase

**Checklist**:

1. Verify `app_logs` table exists (run migration)
2. Check RLS policies allow authenticated user inserts
3. Verify 10% sampling may skip most logs (expected)
4. Check network tab for failed Supabase requests
5. Verify batch flushing interval (30 seconds default)

### Performance traces not recording

**Checklist**:

1. Verify Firebase Performance enabled in Firebase Console
2. Rebuild app with `npx expo prebuild --clean`
3. Check 5% sampling may skip most traces (expected)
4. Verify running on native platform (iOS/Android, not web)
5. Check Firebase Performance dashboard (may take 5-10 minutes)

### Backend initialization errors

**Issue**: Console warnings about unavailable backends.

**Solution**: This is expected if Firebase is disabled or modules not installed. Logger gracefully degrades and continues working with available backends.
