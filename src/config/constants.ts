// Centralized tunables for notifications and related UX
export const NOTIFICATIONS = {
  softDeclineCooldownMs: 3 * 24 * 60 * 60 * 1000, // 3 days
  initialSoftPromptTrigger: 'first-entry' as 'app-install' | 'first-entry',
  toastDurationMs: {
    foregroundReminder: 5000,
    default: 4000,
  },
  reminderSeriesDefaultCount: 3, // TODO: adjust to 30
};

// Sync + background task cadence
export const SYNC = {
  defaultIntervalMs: 60_000, // 1 minute
  defaultFetchIntervalSec: 15 * 60, // 15 minutes
  baseBackoffMs: 2_000,
  maxBackoffMs: 5 * 60 * 1000,
  defaultBatchSize: 50,
};

// Database maintenance
export const DATABASE = {
  archiveDays: 365 * 2,
  cleanupPeriodDays: 90,
  // Schema and checkpoint thresholds can be added here when we lift them from code
};

// Query/cache defaults
export const QUERY_CACHE = {
  staleTimeMs: 5 * 60 * 1000, // 5 minutes
  gcTimeMs: 10 * 60 * 1000, // 10 minutes
  twentyFourHoursMs: 24 * 60 * 60 * 1000,
};

// Analytics limits
export const ANALYTICS = {
  eventNameMaxLength: 40,
  paramNameMaxLength: 24,
  paramLimit: 24,
};

// Observability configuration (logging + analytics sampling)
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
      batchSize: 50,
      flushIntervalMs: 30_000,
    },
    performance: {
      enabled: true,
    },
  },
  development: {
    errorReporting: { enabled: false },
    analytics: { enabled: false },
    appLogs: { enabled: false, batchSize: 50, flushIntervalMs: 30_000 },
    performance: { enabled: false },
  },
};

// Validation constraints
export const VALIDATION = {
  sortOrderMin: 0,
  sortOrderMax: 10_000,
  nameMaxLength: 200,
};

// Notification defaults live in DEFAULT_NOTIFICATION_PREFERENCES; keep other
// app-wide constants here as needed.
