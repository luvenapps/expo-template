# Database Migrations

This directory contains SQL migration files for your Supabase/PostgreSQL database.

## First Time Setup

When using this template, you need to generate your own migration files based on your domain configuration:

### 1. Configure Your Domain

Edit `src/config/domain.config.ts` to define your app's entities:

```typescript
export const DOMAIN = {
  app: {
    name: 'myapp',
    displayName: 'My App',
    // ...
  },
  entities: {
    primary: {
      name: 'task', // Change to your domain
      plural: 'tasks',
      tableName: 'tasks',
      remoteTableName: 'tasks',
      displayName: 'Task',
    },
    entries: {
      name: 'completion',
      plural: 'completions',
      tableName: 'task_completions',
      remoteTableName: 'task_completions',
      displayName: 'Completion',
      foreignKey: 'taskId',
      row_id: 'task_id',
    },
    // ... configure reminders and devices
  },
};
```

### 2. Generate Your First Migration

```bash
npm run db:migrate
```

This will:

- Generate a Drizzle schema migration from your TypeScript schema
- Add Row Level Security (RLS) policies
- Create a timestamped SQL file in this directory (e.g., `0000_ancient_phoenix.sql`)

### 3. Review the Generated Migration

Open the generated `.sql` file and verify:

- ✅ Table names match your DOMAIN config
- ✅ Foreign key columns are correct
- ✅ Indexes are properly named
- ✅ RLS policies reference the correct tables

### 4. Apply to Supabase

**Local development:**

```bash
npm run supabase:dev
```

**Production:**

```bash
npm run supabase:deploy
```

## Example Migration

See `0000_example.sql.example` for a reference of what a generated migration looks like (using "habits" as an example domain).

**Note:** This example file should be deleted when you're ready to generate your actual migrations.

## Subsequent Migrations

When you change your database schema:

1. Modify the schema files in `src/db/postgres/schema.ts`
2. Run `npm run db:migrate`
3. A new migration file will be created (e.g., `0001_steep_hulk.sql`)
4. Review and apply it

## Migration Files

Migration files:

- Are auto-generated from your Drizzle schema
- Should be committed to version control
- Run in sequential order (0000, 0001, 0002...)
- Should not be manually edited (regenerate if needed)

## Troubleshooting

**No schema changes detected:**

- Make sure you've modified `src/db/postgres/schema.ts`
- Delete the last migration file and regenerate if needed

**Table names don't match:**

- Check your DOMAIN config in `src/config/domain.config.ts`
- Regenerate the migration after fixing the config

**RLS policies not working:**

- Ensure your Supabase project has auth enabled
- Check that policies were applied (they're at the end of the migration file)

## Learn More

- [Drizzle Kit Documentation](https://orm.drizzle.team/kit-docs/overview)
- [Supabase Migrations](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [Row Level Security (RLS)](https://supabase.com/docs/guides/auth/row-level-security)
