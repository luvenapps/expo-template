# Database Migrations Guide

This project uses **Drizzle ORM** for both SQLite (local) and Postgres (Supabase) schemas, making all database schemas generic and driven by the DOMAIN configuration.

## Architecture

### Single Source of Truth

All database schemas are defined using the `DOMAIN` config in [src/config/domain.config.ts](../src/config/domain.config.ts). This means:

- ✅ Change table names in one place
- ✅ Both SQLite and Postgres schemas stay in sync
- ✅ Fully template-ready and reusable
- ✅ Type-safe schema definitions

### Two Schemas, One Config

1. **SQLite (Local)**: [src/db/sqlite/schema.ts](../src/db/sqlite/schema.ts)
   - Used by the React Native app
   - Offline-first local storage
   - Managed by `drizzle.config.sqlite.ts`

2. **Postgres (Supabase)**: [src/db/postgres/schema.ts](../src/db/postgres/schema.ts)
   - Used by Supabase backend
   - Cloud sync and storage
   - Managed by `drizzle.config.postgres.ts`

**Why two separate files?** See [Schema Architecture](./schema-architecture.md) for a detailed explanation of why we keep separate schema files and how we prevent them from drifting.

## Scripts

### Primary Command (Recommended)

Generate migrations for **both** SQLite and Postgres in one command:

```bash
npm run db:migrate
```

This single command:

- ✅ Generates SQLite migration
- ✅ Generates Postgres migration
- ✅ Auto-generates RLS policies from DOMAIN config
- ✅ Handles partial indexes and other Drizzle limitations

**Use this command 99% of the time** when making schema changes.

### Individual Commands (Advanced)

For rare cases where you need fine-grained control:

```bash
# Generate only SQLite migration
npm run db:generate

# Generate only Postgres migration (with RLS)
npm run db:generate:postgres

# Generate only RLS policies
npm run db:generate-rls

# Push SQLite schema directly (without migration files)
npm run db:push
```

### Deployment Commands

```bash
# Push to Supabase (local development)
npm run supabase:dev

# Deploy to Supabase (production)
npm run supabase:deploy
```

## How It Works

### Making Schema Changes (Quick Start)

1. Edit **both** schema files:
   - [src/db/sqlite/schema.ts](../src/db/sqlite/schema.ts)
   - [src/db/postgres/schema.ts](../src/db/postgres/schema.ts)

2. Run one command:

   ```bash
   npm run db:migrate
   ```

3. Review generated migrations:
   - `src/db/sqlite/migrations/`
   - `supabase/migrations/`

4. Test and deploy:
   ```bash
   npm start              # SQLite auto-applies
   npm run supabase:dev   # Test Postgres locally
   npm run supabase:deploy # Deploy to production
   ```

### Detailed: SQLite Migrations

1. Edit [src/db/sqlite/schema.ts](../src/db/sqlite/schema.ts)
2. Run `npm run db:generate` (or use `npm run db:migrate` for both)
3. Drizzle generates migration in `src/db/sqlite/migrations/`
4. Migrations auto-apply when app starts (or run `npm run db:push` to apply immediately)

### Detailed: Postgres Migrations

1. Edit [src/db/postgres/schema.ts](../src/db/postgres/schema.ts)
2. Run `npm run db:generate:postgres` (or use `npm run db:migrate` for both)
3. This automatically:
   - Generates Drizzle migration in `supabase/migrations/`
   - Generates RLS policies from DOMAIN config
   - Appends RLS policies to the migration
4. Run `npm run supabase:dev` to test locally
5. Run `npm run supabase:deploy` to deploy to production

## Row Level Security (RLS)

Since Drizzle doesn't support RLS policy generation, we have a separate system:

- **Generator**: [scripts/generate-rls-policies.mjs](../scripts/generate-rls-policies.mjs)
- **Pattern Template**: [src/db/postgres/rls-policies.template.sql](../src/db/postgres/rls-policies.template.sql) (generic, committed to Git)
- **Generated SQL**: `src/db/postgres/rls-policies.sql` (auto-generated, NOT committed to Git)
- **Auto-generated**: RLS policies are derived from DOMAIN config

**Note**: The generated `rls-policies.sql` file is in `.gitignore` because it contains project-specific table names. Run `npm run db:generate-rls` to regenerate it from your DOMAIN config.

### RLS Policy Rules

All tables follow this pattern:

```sql
create policy "Users can manage their own [table]"
  on public.[table]
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

## Making Changes to the DOMAIN Config

When you update [src/config/domain.config.ts](../src/config/domain.config.ts):

1. **Update both schemas**:
   - [src/db/sqlite/schema.ts](../src/db/sqlite/schema.ts)
   - [src/db/postgres/schema.ts](../src/db/postgres/schema.ts)

2. **Generate migrations**:

   ```bash
   npm run db:migrate  # Generates both SQLite and Postgres migrations
   ```

3. **Test locally**:

   ```bash
   npm start              # Test SQLite changes
   npm run supabase:dev   # Test Postgres changes
   ```

4. **Deploy**:
   ```bash
   npm run supabase:deploy
   ```

## Example: Renaming a Table

Let's say you want to rename `habits` to `goals`:

1. Update [src/config/domain.config.ts](../src/config/domain.config.ts):

   ```ts
   primary: {
     name: 'goal',
     plural: 'goals',
     tableName: 'goals',
     remoteTableName: 'goals',
     displayName: 'Goal',
   }
   ```

2. Update both schema files to use the new DOMAIN values

3. Generate migrations:

   ```bash
   npm run db:migrate  # Generates both migrations
   ```

4. The RLS policies will automatically update to use "goals"

5. Review and deploy:
   ```bash
   npm start              # Test locally
   npm run supabase:deploy # Deploy to production
   ```

## Benefits

### Template-Ready

- Fork this project and change DOMAIN config
- All schemas and migrations adapt automatically
- No manual SQL writing required

### Type Safety

- TypeScript compiler catches schema errors
- Autocomplete for table names
- Compile-time validation

### Consistency

- SQLite and Postgres schemas stay in sync
- One config, two databases
- Less chance of drift

### Maintainability

- Clear separation of concerns
- Easy to understand and modify
- Well-documented patterns

## Troubleshooting

### Drizzle generates incorrect SQL

- Check that both schema files use DOMAIN config correctly
- Verify table names match in DOMAIN config
- Run `npm run type-check` to catch TypeScript errors

### RLS policies not applied

- Ensure you ran `npm run db:generate:postgres` (not just drizzle-kit)
- Check that RLS policies are in the migration file
- Manually apply: `npx supabase db execute -f src/db/postgres/rls-policies.sql`

### Schema out of sync

- Review DOMAIN config for typos
- Regenerate both migrations
- Compare SQLite and Postgres schemas

## Further Reading

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Supabase Migrations](https://supabase.com/docs/guides/database/migrations)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
