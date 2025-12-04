# Observability & Notifications

## Analytics Provider

- `src/observability/AnalyticsProvider.tsx` exposes `useAnalytics()` with `trackEvent`, `trackError`, and `trackPerformance`.
- The provider emits `[Observability] ...` logs in dev builds and forwards envelopes to Firebase Analytics whenever the native config files and/or web env vars are present (see `docs/firebase-setup.md` for setup instructions).
- Expo web can lack `localStorage`, so we keep the MMKV/localStorage fallback and persist a generated distinct id for future analytics backends.
- The distinct id lives in MMKV (native) or `localStorage` (web) under `${DOMAIN.app.storageKey}-analytics-id`.
- The Jest suite stubs these storage layers (`__tests__/src/observability/AnalyticsProvider.test.tsx`) so you can assert against console output without real network calls.

### Configuration

- Native builds: add `credentials/GoogleService-Info.plist` and `credentials/google-services.json` (Expo config plugin loads them automatically).
- Web builds: populate `.env.local` with `EXPO_PUBLIC_FIREBASE_*` values so the Firebase JS SDK initializes in Expo Web.
- If either configuration is missing, the provider gracefully falls back to console logging only.

### Event conventions

| Event                             | When triggered                                             | Metadata                                  |
| --------------------------------- | ---------------------------------------------------------- | ----------------------------------------- |
| `notifications:reminders`         | Reminders toggle clicked                                   | `{ enabled: boolean }`                    |
| `notifications:reminders-blocked` | User attempted to enable reminders but OS blocked requests | none                                      |
| `notifications:daily-summary`     | Daily summary toggle clicked                               | `{ enabled: boolean }`                    |
| `notifications:quiet-hours`       | Quiet hours slider moved                                   | `{ start: number, end: number }`          |
| `notifications:permissions`       | Permission refresh fails (via `trackError`)                | `{ source: 'notifications:permissions' }` |
| `iam:displayed`                   | Firebase IAM message displayed                             | none                                      |
| `iam:clicked`                     | Firebase IAM message clicked                               | none                                      |
| `iam:dismissed`                   | Firebase IAM message dismissed                             | none                                      |

Add new events in the relevant hooks/components and keep namespaced by feature (`sync:*`, `items:*`, etc.).

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

### Error handling pattern

- Use `useFriendlyErrorHandler(toastController?)` for any user-facing error. It:
  - Resolves an error to friendly/translated copy via `resolveFriendlyError`.
  - Logs `trackError` with code + surface.
  - Optionally shows a toast when a toast controller is provided (skip for inline-only flows).
- Inline errors: call the hook without a toast controller, and render `handlerResult.friendly` copy in the UI.
- Toasts: only for low-priority confirmations or minor warnings; don’t duplicate inline messaging and toasts for the same error.

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

### Push prompt cadence (remote push)

- Defaults live in `src/config/constants.ts` under `NOTIFICATIONS`:
  - `pushMaxAttempts`: 3 attempts before we stop prompting.
  - `pushPromptCooldownMs`: 7 days between prompts after a decline.
- Enforcement happens in `useNotificationSettings` (`canPromptForPush` and `pushOptInStatus`).
- Successful opt-in resets attempts; revoke/disable resets attempts to 0; cooldown expiry re-allows prompting without auto-resetting attempts until a success/disable.
