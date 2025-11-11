# Observability & Notifications

Stage 5 focuses on the instrumentation agents need to reason about runtime behaviour (analytics, logging, notifications) before we layer on habit-specific UX.

## Analytics Provider

- `src/observability/AnalyticsProvider.tsx` exposes `useAnalytics()` with `trackEvent`, `trackError`, and `trackPerformance`.
- The provider is wired into `AppProviders`, so every screen/component can call `useAnalytics` without extra plumbing.
- In dev, events/errors print to the console with `[Observability]` prefixes; swap the internals when you hook up Segment, Amplitude, etc.
- For unit tests, mock `useAnalytics` to avoid console noise (see `__tests__/src/notifications/useNotificationSettings.test.tsx`).

### Event conventions

| Event                             | When triggered                                             | Metadata                                  |
| --------------------------------- | ---------------------------------------------------------- | ----------------------------------------- |
| `notifications:reminders`         | Reminders toggle clicked                                   | `{ enabled: boolean }`                    |
| `notifications:reminders-blocked` | User attempted to enable reminders but OS blocked requests | none                                      |
| `notifications:daily-summary`     | Daily summary toggle clicked                               | `{ enabled: boolean }`                    |
| `notifications:quiet-hours`       | Quiet hours slider moved                                   | `{ start: number, end: number }`          |
| `notifications:permissions`       | Permission refresh fails (via `trackError`)                | `{ source: 'notifications:permissions' }` |

Add new events in the relevant hooks/components and keep namespaced by feature (`sync:*`, `habits:*`, etc.).

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
