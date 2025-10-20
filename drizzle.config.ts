import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/sqlite/schema.ts',
  out: './src/db/sqlite/migrations',
  dialect: 'sqlite',
  verbose: true,
  strict: true,
} satisfies Config;
