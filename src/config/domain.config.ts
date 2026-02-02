/**
 * Domain Configuration
 *
 * This file defines all app-specific and entity-specific naming conventions.
 * Change these values to customize the app for different use cases.
 *
 * For template usage:
 * - Update `app.name` and related fields for your app
 * - Update `entities.primary` to match your main domain entity
 * - Update `entities.entries` to match your entity's child records
 * - Keep `reminders` and `devices` unless you need to rename them
 */

export const DOMAIN = {
  /**
   * Application-level configuration
   */
  app: {
    name: '__APP_NAME__',
    displayName: '__APP_NAME__',
    companyName: 'Luven LLC',
    supportEmail: 'support@luvenapps.com',
    database: '__APP_NAME__.db',
    syncTask: '__APP_NAME__-sync-task',
    storageKey: '__APP_NAME__',
    cursorStorageId: '__APP_NAME__-sync-cursors',
    analyticsStorageKey: '__APP_NAME__-analytics-id',
    analyticsStorageNamespace: '__APP_NAME__-analytics',
  },

  /**
   * Entity definitions
   * Each entity represents a syncable table in the application
   */
  entities: {
    /**
     * Primary domain entity (the main thing your app manages)
     * Examples: task, project, workout, note, etc.
     */
    primary: {
      name: '__APP_NAME__SINGULAR__', // Singular form
      plural: '__APP_NAME__', // Plural form
      tableName: '__APP_NAME__', // Local SQLite table name
      remoteTableName: '__APP_NAME__', // Supabase table name
      displayName: '__APP_NAME__SINGULAR__', // Display name for UI
    },

    /**
     * Entry/activity records for the primary entity
     * Examples: example_entries, task_completions, workout_sessions, etc.
     */
    entries: {
      name: 'entry', // Singular form
      plural: 'entries', // Plural form
      tableName: '__APP_NAME__SINGULAR___entries', // Local SQLite table name
      remoteTableName: '__APP_NAME__SINGULAR___entries', // Supabase table name
      displayName: 'Entry', // Display name for UI
      foreignKey: '__APP_NAME__SINGULAR__Id', // Foreign key column name referencing primary entity
      row_id: '__APP_NAME__SINGULAR___id', // Row Id
    },

    /**
     * Reminders/notifications for the primary entity
     */
    reminders: {
      name: 'reminder',
      plural: 'reminders',
      tableName: 'reminders',
      remoteTableName: 'reminders',
      displayName: 'Reminder',
      foreignKey: '__APP_NAME__SINGULAR__Id', // Foreign key column name referencing primary entity
    },

    /**
     * User devices for push notifications
     */
    devices: {
      name: 'device',
      plural: 'devices',
      tableName: 'devices',
      remoteTableName: 'devices',
      displayName: 'Device',
    },
  },
} as const;

/**
 * Type-safe table name union
 */
export type TableName =
  (typeof DOMAIN.entities)[keyof typeof DOMAIN.entities]['tableName'];

/**
 * Type-safe remote table name union
 */
export type RemoteTableName =
  (typeof DOMAIN.entities)[keyof typeof DOMAIN.entities]['remoteTableName'];
