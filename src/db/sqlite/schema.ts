import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { DOMAIN } from '@/config/domain.config';

const versionColumn = () => integer('version').default(1).notNull();
const timestampColumn = (name: string) => text(name).notNull();
const optionalTimestamp = (name: string) => text(name);

/**
 * Primary domain entity table
 * Configured via DOMAIN.entities.primary in domain.config.ts
 */
export const primaryEntity = sqliteTable(
  DOMAIN.entities.primary.tableName,
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    cadence: text('cadence').notNull(),
    color: text('color').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    isArchived: integer('is_archived', { mode: 'boolean' }).default(false).notNull(),
    createdAt: timestampColumn('created_at'),
    updatedAt: timestampColumn('updated_at'),
    version: versionColumn(),
    deletedAt: optionalTimestamp('deleted_at'),
  },
  (table) => [
    index(`${DOMAIN.entities.primary.tableName}_user_updated_idx`).on(
      table.userId,
      table.updatedAt,
    ),
  ],
);

/**
 * Entry/activity records for the primary entity
 * Configured via DOMAIN.entities.entries in domain.config.ts
 */
export const entryEntity = sqliteTable(
  DOMAIN.entities.entries.tableName,
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    habitId: text('habit_id').notNull(),
    date: text('date').notNull(),
    amount: integer('amount').default(0).notNull(),
    source: text('source').default('local').notNull(),
    createdAt: timestampColumn('created_at'),
    updatedAt: timestampColumn('updated_at'),
    version: versionColumn(),
    deletedAt: optionalTimestamp('deleted_at'),
  },
  (table) => [
    uniqueIndex(`${DOMAIN.entities.entries.tableName}_unique`).on(
      table.habitId,
      table.date,
      table.deletedAt,
    ),
    index(`${DOMAIN.entities.entries.tableName}_user_habit_idx`).on(
      table.userId,
      table.habitId,
      table.date,
    ),
  ],
);

/**
 * Reminders/notifications for the primary entity
 * Configured via DOMAIN.entities.reminders in domain.config.ts
 */
export const reminderEntity = sqliteTable(
  DOMAIN.entities.reminders.tableName,
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    habitId: text('habit_id').notNull(),
    timeLocal: text('time_local').notNull(),
    daysOfWeek: text('days_of_week').notNull(),
    timezone: text('timezone').notNull(),
    isEnabled: integer('is_enabled', { mode: 'boolean' }).default(true).notNull(),
    createdAt: timestampColumn('created_at'),
    updatedAt: timestampColumn('updated_at'),
    version: versionColumn(),
    deletedAt: optionalTimestamp('deleted_at'),
  },
  (table) => [
    index(`${DOMAIN.entities.reminders.tableName}_user_habit_enabled_idx`).on(
      table.userId,
      table.habitId,
      table.isEnabled,
    ),
  ],
);

/**
 * User devices for push notifications
 * Configured via DOMAIN.entities.devices in domain.config.ts
 */
export const deviceEntity = sqliteTable(DOMAIN.entities.devices.tableName, {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  platform: text('platform').notNull(),
  lastSyncAt: optionalTimestamp('last_sync_at'),
  createdAt: timestampColumn('created_at'),
  updatedAt: timestampColumn('updated_at'),
  version: versionColumn(),
  deletedAt: optionalTimestamp('deleted_at'),
});

export const outbox = sqliteTable('outbox', {
  id: text('id').primaryKey(),
  tableName: text('table_name').notNull(),
  rowId: text('row_id').notNull(),
  operation: text('operation').notNull(),
  payload: text('payload_json').notNull(),
  version: versionColumn(),
  attempts: integer('attempts').default(0).notNull(),
  createdAt: timestampColumn('created_at'),
});
