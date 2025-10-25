/* istanbul ignore file */
import { Platform } from 'react-native';

/**
 * SQLite database instance using expo-sqlite.
 *
 * Strategy:
 * - Native (iOS/Android): Uses sync API (openDatabaseSync) with drizzle
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
      const { drizzle } = await import('drizzle-orm/expo-sqlite');
      const { openDatabaseSync } = await import('expo-sqlite');
      dbInstance = drizzle(openDatabaseSync('expotemplate.db'));
      return dbInstance;
    })();
  }

  return dbPromise;
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
    dbInstance = drizzle(openDatabaseSync('expotemplate.db'));
  }
  return dbInstance;
}

export const db: any =
  Platform.OS === 'web'
    ? undefined
    : new Proxy({} as any, {
        get(_target, prop) {
          return initializeDb()[prop];
        },
      });
