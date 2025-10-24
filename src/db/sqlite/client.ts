/* istanbul ignore file */
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseAsync, openDatabaseSync } from 'expo-sqlite';
import { Platform } from 'react-native';

/**
 * SQLite database instance using expo-sqlite.
 *
 * Strategy:
 * - Native (iOS/Android): Uses sync API (openDatabaseSync) - returns drizzle instance immediately
 * - Web: Uses async API (openDatabaseAsync) - returns Promise<drizzle instance>
 *
 * This avoids the need for COEP/COOP headers (required for SharedArrayBuffer on web)
 * while keeping database functionality working across all platforms.
 *
 * Usage in async contexts (recommended):
 *   const dbInstance = await getDb();
 *   await dbInstance.select()...
 *
 * Direct usage (works on native, need to await on web):
 *   const dbInstance = await db;  // resolves immediately on native, waits on web
 */

const dbPromise =
  Platform.OS === 'web'
    ? openDatabaseAsync('expotemplate.db').then((sqlite) => drizzle(sqlite))
    : Promise.resolve(drizzle(openDatabaseSync('expotemplate.db')));

// For backward compatibility - on native it's the drizzle instance, on web it's a Promise
const db: any = Platform.OS === 'web' ? dbPromise : drizzle(openDatabaseSync('expotemplate.db'));

/**
 * Get the database instance (async-safe for all platforms)
 * @returns Promise that resolves to the drizzle database instance
 */
export async function getDb() {
  return dbPromise;
}

export { db };
