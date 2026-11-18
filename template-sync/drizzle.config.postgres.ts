import type { Config } from 'drizzle-kit';

/**
 * Drizzle configuration for Postgres/Supabase
 * Generates migrations for the remote database
 */
export default {
  schema: './src/db/postgres/schema.ts',
  out: './supabase/migrations',
  dialect: 'postgresql',
  verbose: true,
  strict: true,
} satisfies Config;
