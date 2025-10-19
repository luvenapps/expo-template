import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/sqlite/schema.ts',
  out: './src/db/sqlite/migrations',
  driver: 'expo',
  verbose: true,
  strict: true,
} satisfies Config;
