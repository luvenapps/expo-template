/* istanbul ignore file */
import { DOMAIN } from '@/config/domain.config';
import { Platform } from 'react-native';
import { emitDatabaseReset } from './events';
import { deviceEntity, entryEntity, outbox, primaryEntity, reminderEntity } from './schema';

/**
 * SQLite database instance using expo-sqlite.
 *
 * Strategy:
 * - Native (iOS/Android): Uses async API (openDatabaseAsync) with drizzle for better performance and GC behavior
 * - Web: Database operations are no-ops (drizzle-orm/expo-sqlite only supports sync API which requires SharedArrayBuffer on web)
 *
 * For web support, consider using a different database solution (IndexedDB, etc.)
 * or implementing server-side sync without local database.
 *
 * Usage in async contexts (recommended):
 *   const dbInstance = await getDb();
 *   await dbInstance.select()...
 */

let dbInstance: any = null;
let dbPromise: Promise<any> | null = null;
let sqliteHandle: any = null; // Keep strong reference to prevent garbage collection
async function createDrizzleInstance() {
  const { drizzle } = await import('drizzle-orm/expo-sqlite');
  const { openDatabaseAsync } = await import('expo-sqlite');

  sqliteHandle = await openDatabaseAsync(DOMAIN.app.database);

  if (!sqliteHandle) {
    throw new Error('Failed to open SQLite database - returned null');
  }

  await ensureSqliteSchema(sqliteHandle);
  dbInstance = drizzle(sqliteHandle);

  return dbInstance;
}

/**
 * Get the database instance (async-safe for all platforms)
 * @returns Promise that resolves to the drizzle database instance
 * @throws Error on web platform
 */
export async function getDb() {
  if (Platform.OS === 'web') {
    throw new Error('SQLite database is not supported on web. Use server-side storage instead.');
  }

  if (!dbPromise) {
    dbPromise = (async () => {
      try {
        return await createDrizzleInstance();
      } catch (error) {
        console.error('[SQLite] Database initialization failed:', error);
        dbPromise = null; // Reset so it can be retried
        throw error;
      }
    })();
  }

  return dbPromise;
}

export async function resetDatabase() {
  if (Platform.OS === 'web') {
    return;
  }

  if (sqliteHandle) {
    try {
      await sqliteHandle.closeAsync();
    } catch (error) {
      console.warn('[SQLite] Error closing database handle during reset:', error);
    }
  }

  dbInstance = null;
  dbPromise = null;
  sqliteHandle = null;
  resetSchemaInitialization();

  // Give native side time to fully release resources (especially after rapid operations)
  // This prevents immediate retry from hitting the same stale handle
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Emit event so listeners (like outbox) can reset themselves
  emitDatabaseReset();
}

/**
 * Check if the database has any data
 * @returns Promise that resolves to true if any table has records
 */
export async function hasData(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  try {
    const database = await getDb();

    const results = await Promise.all([
      database.select().from(outbox).limit(1),
      database.select().from(primaryEntity).limit(1),
      database.select().from(entryEntity).limit(1),
      database.select().from(reminderEntity).limit(1),
      database.select().from(deviceEntity).limit(1),
    ]);

    return results.some((rows) => rows.length > 0);
  } catch (error) {
    console.error('[SQLite] Error checking for data:', error);
    return false;
  }
}

/**
 * Clear all records from all tables using DELETE statements
 * Keeps the database file and connection open - more realistic for production usage
 * Uses a transaction to ensure atomicity
 * @throws Error on web platform or if database operations fail
 */
export async function clearAllTables() {
  if (Platform.OS === 'web') {
    throw new Error('SQLite database is not supported on web.');
  }

  const clearOperation = async (): Promise<void> => {
    // Ensure database is properly initialized (handles retry after resetDatabase)
    // This ensures schema is set up and we have a valid handle
    await getDb();

    // Now use the initialized handle
    const handleToUse = sqliteHandle;

    if (!handleToUse) {
      throw new Error('Failed to get database handle after initialization');
    }

    // Delete all records in a transaction for atomicity
    // Order matters for foreign key constraints (delete children before parents)
    await handleToUse.execAsync('BEGIN TRANSACTION');

    try {
      await handleToUse.execAsync('DELETE FROM outbox');
      await handleToUse.execAsync(`DELETE FROM ${DOMAIN.entities.reminders.tableName}`);
      await handleToUse.execAsync(`DELETE FROM ${DOMAIN.entities.entries.tableName}`);
      await handleToUse.execAsync(`DELETE FROM ${DOMAIN.entities.primary.tableName}`);
      await handleToUse.execAsync(`DELETE FROM ${DOMAIN.entities.devices.tableName}`);
      await handleToUse.execAsync('COMMIT');
    } catch (error) {
      try {
        await handleToUse.execAsync('ROLLBACK');
        console.error('[SQLite] Transaction rolled back due to error');
      } catch (rollbackError) {
        console.warn('[SQLite] Error during rollback (handle may be stale):', rollbackError);
      }
      throw error;
    }

    // Vacuum to reclaim space
    await handleToUse.execAsync('VACUUM');
  };

  try {
    // Import retry utility
    const { withDatabaseRetry } = await import('./retry');

    // Execute with retry logic to handle stale handles
    await withDatabaseRetry(clearOperation);

    // Emit event so listeners (like outbox) can reset their caches
    emitDatabaseReset();
  } catch (error) {
    console.error('[SQLite] Error during database clear:', error);
    throw error;
  }
}

// For backward compatibility - on web, export a stub that doesn't throw on import
// Only throws when actually accessed (when methods are called)
function initializeDb() {
  if (!dbInstance) {
    // Using require here is intentional for lazy sync loading on native
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle } = require('drizzle-orm/expo-sqlite');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { openDatabaseSync } = require('expo-sqlite');

    sqliteHandle = openDatabaseSync(DOMAIN.app.database);

    ensureSqliteSchema(sqliteHandle);
    dbInstance = drizzle(sqliteHandle);
  }
  return dbInstance;
}

export const db: any =
  Platform.OS === 'web'
    ? undefined
    : new Proxy({} as any, {
        get(_target, prop) {
          // Don't initialize database for React internal property checks
          // React Fast Refresh checks $$typeof, prototype, etc. to determine if something is a component
          const reactInternalProps = ['$$typeof', 'prototype', 'constructor', '__esModule'];
          if (reactInternalProps.includes(String(prop))) {
            return undefined;
          }

          return initializeDb()[prop];
        },
      });
