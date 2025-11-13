# Observability & Notifications

Stage 5 focuses on the instrumentation agents need to reason about runtime behaviour (analytics, logging, notifications) before we layer on habit-specific UX.

## Analytics Provider

- `src/observability/AnalyticsProvider.tsx` exposes `useAnalytics()` with `trackEvent`, `trackError`, and `trackPerformance`.
- Under the hood we instantiate the official `posthog-react-native` client, wrap the tree in `PostHogProvider`, and forward every envelope via `posthog.capture(...)`. Dev builds still log to `[Observability]` for quick inspection.
- Expo web complains about missing storage by default, so we inject a custom storage layer (localStorage/MMKV fallback) and persist a generated distinct id so every event has a stable anonymous user id.
- We persist a locally generated distinct id (MMKV/localStorage) so events remain tied to the same anonymous user until you call `identify` elsewhere.
- For unit tests, mock `useAnalytics` (or the PostHog module) to avoid console noise (see `__tests__/src/observability/AnalyticsProvider.test.tsx`).

### Configuration

```bash
EXPO_PUBLIC_ANALYTICS_ENDPOINT=https://app.posthog.com
# or self-hosted: https://us.i.posthog.com / https://posthog.mycompany.com
EXPO_PUBLIC_ANALYTICS_WRITE_KEY=phc_your_project_key
```

- If you prefer a separate host env var, set `EXPO_PUBLIC_ANALYTICS_HOST`; otherwise we fall back to `EXPO_PUBLIC_ANALYTICS_ENDPOINT`.
- Store the values as EAS secrets for preview/prod builds. Locally you can drop them into `.env.local`.
- When unset, the provider quietly logs to console and skips PostHog initialization.

### Event conventions

| Event                             | When triggered                                             | Metadata                                  |
| --------------------------------- | ---------------------------------------------------------- | ----------------------------------------- |
| `notifications:reminders`         | Reminders toggle clicked                                   | `{ enabled: boolean }`                    |
| `notifications:reminders-blocked` | User attempted to enable reminders but OS blocked requests | none                                      |
| `notifications:daily-summary`     | Daily summary toggle clicked                               | `{ enabled: boolean }`                    |
| `notifications:quiet-hours`       | Quiet hours slider moved                                   | `{ start: number, end: number }`          |
| `notifications:permissions`       | Permission refresh fails (via `trackError`)                | `{ source: 'notifications:permissions' }` |

Add new events in the relevant hooks/components and keep namespaced by feature (`sync:*`, `habits:*`, etc.).

### Friendly error catalog

Stage 8 introduces a shared resolver (`src/errors/friendly.ts`) so low-level errors map to actionable copy + analytics events. Every time `resolveFriendlyError` is used we also call `useAnalytics().trackError(...)` with the codes below.

| Code                       | Title                     | Description                                                            | Typical source                    |
| -------------------------- | ------------------------- | ---------------------------------------------------------------------- | --------------------------------- |
| `network.offline`          | Check your connection     | We could not reach the server. Verify connectivity and retry.          | Supabase auth, sync, seed data    |
| `sqlite.constraint`        | Already saved             | Entry already exists; nudge users to edit the original.                | Local seed/sample data            |
| `sqlite.storage-full`      | Device storage is full    | Prompt user to free space before retrying.                             | Local seed/sample data            |
| `sqlite.busy`              | Database is busy          | Ask the user to wait a moment.                                         | Background sync, rapid edits      |
| `auth.invalid-credentials` | Invalid email or password | Friendly copy for Supabase “Invalid login credentials”.                | Email/password login              |
| `auth.rate-limit`          | Too many attempts         | Rate-limit or throttling errors from Supabase auth/edge functions.     | Login or reminder scheduling      |
| `notifications.permission` | Notifications unavailable | Expo Notifications cannot reach the edge function / permissions issue. | “Schedule test reminder” dev tool |
| `unknown`                  | Something went wrong      | Fallback for everything else; we still surface the original message.   | Any                               |

When adding new errors, extend `resolveFriendlyError` and update this table so UX + support stay in sync.

## Notification Settings

- `src/notifications/useNotificationSettings.ts` centralises permission checks and persisted preferences.
- Preferences are stored via MMKV on native and `localStorage` on web (`src/notifications/preferences.ts`).
- Hook API:

```ts
const {
  remindersEnabled,
  dailySummaryEnabled,
  quietHours, // [startHour, endHour]
  permissionStatus, // granted | prompt | denied | blocked | unavailable
  statusMessage, // last success info from hook
  error, // surfaced error copy
  isSupported,
  isChecking,
  toggleReminders,
  toggleDailySummary,
  updateQuietHours,
  refreshPermissionStatus,
} = useNotificationSettings();
```

- `toggleReminders(true)` requests permission (via `ensureNotificationPermission`). When denied, it reverts the toggle and reports an actionable error.
- `toggleReminders(false)` cancels all scheduled notifications to avoid stale reminders.
- Status/error messages bubble into the Settings UI footer + body copy.

### Permission matrix

| `permissionStatus` | Description                                        | UI copy                                           |
| ------------------ | -------------------------------------------------- | ------------------------------------------------- |
| `granted`          | OS approved notifications                          | “Notifications are enabled for this device.”      |
| `prompt`           | Undetermined/promptable                            | “Enable notifications to receive reminders.”      |
| `denied`           | Denied but can still ask                           | “Notifications are currently denied.”             |
| `blocked`          | Denied & cannot ask (user changed system settings) | “Notifications are blocked in system settings.”   |
| `unavailable`      | Platform not supported (web)                       | “Notifications are unavailable on this platform.” |

## Settings UI updates

- Notifications section now reflects real permission state, last action messaging, and error copy.
- Toggles are disabled when unsupported or while permission checks are running.
- Quiet hours slider writes to persisted preferences and emits analytics events.

## Testing

- `__tests__/src/notifications/useNotificationSettings.test.tsx` covers the hook (permission flows, state persistence, cancellations).
- Settings screen tests mock the hook to validate copy rendering for `statusMessage`, `error`, and permission guidance.
- Expo Notifications + MMKV are mocked in the hook tests; refer to those stubs when adding new behaviour.

## Next steps

- Wire analytics outputs to your preferred backend (Segment, PostHog, Datadog, etc.).
- Extend notification scheduling to queue actual reminders once Stage 8 habit flows ship.
- Add dashboards/alerts (Sentry, Logflare, Datadog) using the analytics/logging primitives as the integration point.
