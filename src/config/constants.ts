// Centralized tunables for notifications and related UX
export const NOTIFICATIONS = {
  pushPromptMaxAttempts: 3,
  pushPromptCooldownMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  quietHoursBufferMinutes: 5,
  toastDurationMs: {
    foregroundReminder: 5000,
    default: 4000,
  },
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

// Validation constraints
export const VALIDATION = {
  sortOrderMin: 0,
  sortOrderMax: 10_000,
  nameMaxLength: 200,
};

// Notification defaults live in DEFAULT_NOTIFICATION_PREFERENCES; keep other
// app-wide constants here as needed.
