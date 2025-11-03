import { DOMAIN } from '@/config/domain.config';
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  bigint,
  integer,
} from 'drizzle-orm/pg-core';

/**
 * Postgres Schema - mirrors SQLite schema but for Supabase/Postgres
 * Uses DOMAIN config to remain generic and template-ready
 */

const versionColumn = () => bigint('version', { mode: 'number' }).default(1).notNull();
const timestampColumn = (name: string) =>
  timestamp(name, { withTimezone: true }).notNull().defaultNow();
const optionalTimestamp = (name: string) => timestamp(name, { withTimezone: true });

/**
 * Primary domain entity table (e.g., habits, tasks, projects)
 * Configured via DOMAIN.entities.primary in domain.config.ts
 */
export const primaryEntity = pgTable(
  DOMAIN.entities.primary.remoteTableName,
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    name: text('name').notNull(),
    cadence: text('cadence').notNull(),
    color: text('color').notNull().default('#0ea5e9'),
    sortOrder: integer('sort_order').default(0).notNull(),
    isArchived: boolean('is_archived').default(false).notNull(),
    createdAt: timestampColumn('created_at'),
    updatedAt: timestampColumn('updated_at'),
    version: versionColumn(),
    deletedAt: optionalTimestamp('deleted_at'),
  },
  (table) => ({
    userUpdatedIdx: index(`${DOMAIN.entities.primary.remoteTableName}_user_id_updated_at_idx`).on(
      table.userId,
      table.updatedAt,
    ),
  }),
);

/**
 * Entry/activity records for the primary entity
 * Configured via DOMAIN.entities.entries in domain.config.ts
 */
export const entryEntity = pgTable(
  DOMAIN.entities.entries.remoteTableName,
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    // Foreign key to primary entity
    [DOMAIN.entities.entries.row_id]: uuid(DOMAIN.entities.entries.row_id)
      .notNull()
      .references(() => primaryEntity.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
    amount: integer('amount').default(0).notNull(),
    source: text('source').default('local').notNull(),
    createdAt: timestampColumn('created_at'),
    updatedAt: timestampColumn('updated_at'),
    version: versionColumn(),
    deletedAt: optionalTimestamp('deleted_at'),
  },
  (table) => ({
    // Unique constraint on habit_id + date where not deleted
    // Note: Drizzle doesn't support partial indexes, so the WHERE clause is added via post-processing
    uniqueIdx: uniqueIndex(
      `${DOMAIN.entities.entries.remoteTableName}_${DOMAIN.entities.entries.row_id}_date_unique`,
    ).on(table[DOMAIN.entities.entries.row_id], table.date),
    userHabitDateIdx: index(
      `${DOMAIN.entities.entries.remoteTableName}_user_${DOMAIN.entities.entries.row_id}_date_idx`,
    ).on(table.userId, table[DOMAIN.entities.entries.row_id], table.date),
  }),
);

/**
 * Reminders/notifications for the primary entity
 * Configured via DOMAIN.entities.reminders in domain.config.ts
 */
export const reminderEntity = pgTable(
  DOMAIN.entities.reminders.remoteTableName,
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    // Foreign key to primary entity
    [DOMAIN.entities.entries.row_id]: uuid(DOMAIN.entities.entries.row_id)
      .notNull()
      .references(() => primaryEntity.id, { onDelete: 'cascade' }),
    timeLocal: text('time_local').notNull(),
    daysOfWeek: text('days_of_week').notNull(),
    timezone: text('timezone').notNull(),
    isEnabled: boolean('is_enabled').default(true).notNull(),
    createdAt: timestampColumn('created_at'),
    updatedAt: timestampColumn('updated_at'),
    version: versionColumn(),
    deletedAt: optionalTimestamp('deleted_at'),
  },
  (table) => ({
    userHabitEnabledIdx: index(
      `${DOMAIN.entities.reminders.remoteTableName}_user_${DOMAIN.entities.entries.row_id}_enabled_idx`,
    ).on(table.userId, table[DOMAIN.entities.entries.row_id], table.isEnabled),
  }),
);

/**
 * User devices for push notifications
 * Configured via DOMAIN.entities.devices in domain.config.ts
 */
export const deviceEntity = pgTable(
  DOMAIN.entities.devices.remoteTableName,
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    platform: text('platform').notNull(),
    lastSyncAt: optionalTimestamp('last_sync_at'),
    createdAt: timestampColumn('created_at'),
    updatedAt: timestampColumn('updated_at'),
    version: versionColumn(),
    deletedAt: optionalTimestamp('deleted_at'),
  },
  (table) => ({
    userPlatformIdx: index(`${DOMAIN.entities.devices.remoteTableName}_user_id_platform_idx`).on(
      table.userId,
      table.platform,
    ),
  }),
);
