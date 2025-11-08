import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import { DOMAIN } from '@/config/domain.config';

const SCHEMA_VERSION = 1;
let initialized = false;

const primaryTable = DOMAIN.entities.primary.tableName;
const entriesTable = DOMAIN.entities.entries.tableName;
const remindersTable = DOMAIN.entities.reminders.tableName;
const devicesTable = DOMAIN.entities.devices.tableName;

const primaryForeignKeyColumn = `${DOMAIN.entities.primary.name}_id`;
const entryForeignKeyColumn = `${DOMAIN.entities.entries.name}_id`;

function buildStatements(): string[] {
  return [
    `CREATE TABLE IF NOT EXISTS "${primaryTable}" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "user_id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "cadence" TEXT NOT NULL,
      "color" TEXT NOT NULL,
      "sort_order" INTEGER DEFAULT 0 NOT NULL,
      "is_archived" INTEGER DEFAULT 0 NOT NULL,
      "created_at" TEXT NOT NULL,
      "updated_at" TEXT NOT NULL,
      "version" INTEGER DEFAULT 1 NOT NULL,
      "deleted_at" TEXT
    );`,
    `CREATE INDEX IF NOT EXISTS "${primaryTable}_user_updated_idx" ON "${primaryTable}" ("user_id","updated_at");`,
    `CREATE TABLE IF NOT EXISTS "${entriesTable}" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "user_id" TEXT NOT NULL,
      "${primaryForeignKeyColumn}" TEXT NOT NULL,
      "date" TEXT NOT NULL,
      "amount" INTEGER DEFAULT 0 NOT NULL,
      "source" TEXT DEFAULT 'local' NOT NULL,
      "created_at" TEXT NOT NULL,
      "updated_at" TEXT NOT NULL,
      "version" INTEGER DEFAULT 1 NOT NULL,
      "deleted_at" TEXT
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "${entriesTable}_unique" ON "${entriesTable}" ("${primaryForeignKeyColumn}","date","deleted_at");`,
    `CREATE INDEX IF NOT EXISTS "${entriesTable}_user_${DOMAIN.entities.primary.name}_idx" ON "${entriesTable}" ("user_id","${primaryForeignKeyColumn}","date");`,
    `CREATE TABLE IF NOT EXISTS "${remindersTable}" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "user_id" TEXT NOT NULL,
      "${entryForeignKeyColumn}" TEXT NOT NULL,
      "time_local" TEXT NOT NULL,
      "days_of_week" TEXT NOT NULL,
      "timezone" TEXT NOT NULL,
      "is_enabled" INTEGER DEFAULT 1 NOT NULL,
      "created_at" TEXT NOT NULL,
      "updated_at" TEXT NOT NULL,
      "version" INTEGER DEFAULT 1 NOT NULL,
      "deleted_at" TEXT
    );`,
    `CREATE INDEX IF NOT EXISTS "${remindersTable}_user_${DOMAIN.entities.primary.name}_enabled_idx" ON "${remindersTable}" ("user_id","${entryForeignKeyColumn}","is_enabled");`,
    `CREATE TABLE IF NOT EXISTS "${devicesTable}" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "user_id" TEXT NOT NULL,
      "platform" TEXT NOT NULL,
      "last_sync_at" TEXT,
      "created_at" TEXT NOT NULL,
      "updated_at" TEXT NOT NULL,
      "version" INTEGER DEFAULT 1 NOT NULL,
      "deleted_at" TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS "outbox" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "table_name" TEXT NOT NULL,
      "row_id" TEXT NOT NULL,
      "operation" TEXT NOT NULL,
      "payload_json" TEXT NOT NULL,
      "version" INTEGER DEFAULT 1 NOT NULL,
      "attempts" INTEGER DEFAULT 0 NOT NULL,
      "created_at" TEXT NOT NULL
    );`,
    `CREATE INDEX IF NOT EXISTS "outbox_table_attempts_idx"
      ON "outbox" ("table_name","attempts","created_at");`,
  ].map((statement) => statement.replace(/\s+\n/g, '\n').trim());
}

export function ensureSqliteSchema(database: SQLiteDatabase) {
  if (Platform.OS === 'web' || initialized) {
    return;
  }

  // Retry once if we hit a stale handle during schema initialization
  // This can happen when a fresh connection is GC'd before we can use it
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (attempt > 0) {
        // Small delay to let GC settle
        const start = Date.now();
        while (Date.now() - start < 50) {
          // busy wait for 50ms
        }
      }

      const currentVersionResult = database.getFirstSync('PRAGMA user_version') as {
        user_version: number;
      } | null;
      const currentVersion = currentVersionResult?.user_version ?? 0;

      if (currentVersion >= SCHEMA_VERSION) {
        initialized = true;
        return;
      }

      database.withTransactionSync(() => {
        database.execSync('PRAGMA foreign_keys = ON');
        const statements = buildStatements();

        for (let i = 0; i < statements.length; i++) {
          try {
            database.execSync(statements[i]);
          } catch (error) {
            console.error(`[SQLite Setup] Failed to execute statement ${i + 1}:`, error);
            throw error;
          }
        }

        database.execSync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
      });

      initialized = true;
      return; // Success - exit retry loop
    } catch (error) {
      lastError = error as Error;
      const errorMessage = (error as Error).message || '';
      const isStaleHandle =
        errorMessage.includes('NullPointerException') ||
        errorMessage.includes('database is closed') ||
        errorMessage.includes('NativeDatabase.prepareSync');

      if (isStaleHandle && attempt < 1) {
        console.warn('[SQLite Setup] Stale handle detected, will retry...');
        continue; // Try again
      }

      // Not a stale handle error, or we've exhausted retries
      console.error('[SQLite Setup] Schema initialization failed:', error);
      throw error;
    }
  }

  // If we get here, retries were exhausted
  if (lastError) {
    console.error('[SQLite Setup] Schema initialization failed after retries');
    throw lastError;
  }
}

export function resetSchemaInitialization() {
  initialized = false;
}
