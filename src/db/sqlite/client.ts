import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite/next';

const sqlite = openDatabaseSync('betterhabits.db');

export const db = drizzle(sqlite);
