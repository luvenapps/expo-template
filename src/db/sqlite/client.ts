/* istanbul ignore file */
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite/next';

const sqlite = openDatabaseSync('expotemplate.db');

export const db = drizzle(sqlite);
