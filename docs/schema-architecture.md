# Database Schema Architecture

## Why Two Separate Schema Files?

You might wonder: why do we have two schema files that look almost identical?

- `src/db/sqlite/schema.ts` (local database)
- `src/db/postgres/schema.ts` (remote database)

### TL;DR

**We keep them separate because Drizzle ORM requires separate schema definitions for different database dialects, and the databases have fundamentally different capabilities.**

---

## The Technical Reasons

### 1. Different Drizzle Dialects

Drizzle ORM uses separate packages for each database type:

```typescript
// SQLite schema
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Postgres schema
import { pgTable, text, uuid, bigint } from 'drizzle-orm/pg-core';
```

These APIs are incompatible - you can't use `pgTable` with SQLite or vice versa.

### 2. Different Data Types

The databases have different native types:

| Concept         | SQLite                                       | Postgres                                          |
| --------------- | -------------------------------------------- | ------------------------------------------------- |
| Primary Key     | `text('id')`                                 | `uuid('id')`                                      |
| Version Counter | `integer('version')`                         | `bigint('version')`                               |
| Timestamps      | `text('created_at')`                         | `timestamp('created_at', { withTimezone: true })` |
| Boolean         | `integer('is_enabled', { mode: 'boolean' })` | `boolean('is_enabled')`                           |

### 3. Different Capabilities

| Feature             | SQLite              | Postgres                                   |
| ------------------- | ------------------- | ------------------------------------------ |
| UUID Type           | ❌ Use text         | ✅ Native `uuid`                           |
| Bigint              | ❌ Use integer      | ✅ Native `bigint`                         |
| Foreign Key Cascade | ⚠️ Limited support  | ✅ Full support with `onDelete: 'cascade'` |
| Partial Indexes     | ⚠️ Different syntax | ✅ `WHERE` clause support                  |
| Row Level Security  | ❌ N/A              | ✅ RLS policies                            |
| Timestamp Timezone  | ❌ Store as text    | ✅ Native `timestamptz`                    |

### 4. Separate Migration Systems

Each schema generates migrations to a different location:

```bash
# SQLite migrations
src/db/sqlite/migrations/

# Postgres migrations
supabase/migrations/
```

Each has its own Drizzle config file pointing to the appropriate schema.

---

## Keeping Them In Sync

### The Challenge

With two files, there's a risk they could drift apart. Someone might update one and forget the other.

### Our Safeguards

#### 1. DOMAIN Configuration

Both schemas use the same `DOMAIN` config for all table and column names:

```typescript
// Both files use:
import { DOMAIN } from '@/config/domain.config';

export const primaryEntity = sqliteTable(DOMAIN.entities.primary.tableName, {
  /* columns */
});
```

This ensures table names always match.

#### 2. Automated Test

We have a test that validates both schemas stay in sync:

[`__tests__/db/schema-sync.test.ts`](../__tests__/db/schema-sync.test.ts)

This test:

- ✅ Checks both schemas have the same tables
- ✅ Verifies DOMAIN config is used correctly
- ✅ Validates core columns exist in both
- ✅ Checks foreign key consistency

Run it with:

```bash
npm test -- __tests__/db/schema-sync.test.ts
```

#### 3. Documentation

When you change one schema, you **must** change the other. The workflow ensures this:

1. Update DOMAIN config (if needed)
2. Update **both** `src/db/sqlite/schema.ts` and `src/db/postgres/schema.ts`
3. Run `npm run db:generate` for SQLite
4. Run `npm run db:generate:postgres` for Postgres
5. Tests will fail if schemas drift

---

## Alternatives Considered

### Could We Have One File?

We considered these alternatives:

#### Option 1: Abstract Schema Definition

Create a JSON/TypeScript object that both schemas consume:

```typescript
// Theoretical approach (NOT IMPLEMENTED)
const SCHEMA_DEFINITION = {
  primary: {
    columns: { id: 'uuid', userId: 'uuid' /* ... */ },
  },
};

// Generate both schemas from this
```

**Why we didn't do this:**

- ❌ Loses Drizzle's type inference
- ❌ Adds complexity layer
- ❌ Still need separate Drizzle schemas underneath
- ❌ Harder to debug
- ❌ Not idiomatic Drizzle usage

#### Option 2: Schema Generation Script

Write a script that generates both schemas from templates:

**Why we didn't do this:**

- ❌ Adds build step complexity
- ❌ Generated files are harder to read/debug
- ❌ Loses IDE autocomplete/type checking during development
- ❌ Non-standard approach

#### Option 3: Single Schema with Conditionals

Use runtime checks to switch between SQLite and Postgres:

**Why we didn't do this:**

- ❌ Drizzle doesn't support this pattern
- ❌ Type system would break
- ❌ Migration tools can't handle it

### The Drizzle Ecosystem Standard

Looking at the Drizzle community and documentation:

- ✅ Separate schema files per dialect is the **standard pattern**
- ✅ Migration tools expect this structure
- ✅ Type inference works best this way
- ✅ Matches how production apps are built

---

## Best Practices

### When Changing Schemas

**Always:**

1. ✅ Update DOMAIN config first (if table names change)
2. ✅ Update both schema files
3. ✅ Generate migrations for both
4. ✅ Run the sync test
5. ✅ Review generated SQL

**Never:**

- ❌ Change only one schema file
- ❌ Skip migration generation
- ❌ Ignore test failures

### Checklist for Schema Changes

```bash
# 1. Update DOMAIN config (if needed)
vim src/config/domain.config.ts

# 2. Update both schemas
vim src/db/sqlite/schema.ts
vim src/db/postgres/schema.ts

# 3. Generate migrations
npm run db:generate           # SQLite
npm run db:generate:postgres  # Postgres

# 4. Verify sync
npm test -- __tests__/db/schema-sync.test.ts

# 5. Review generated SQL
cat src/db/sqlite/migrations/*.sql
cat supabase/migrations/*.sql

# 6. Test locally
npm run supabase:dev
npm start
```

---

## Summary

**Why separate files?**

- Drizzle requires separate dialects
- Databases have different types and capabilities
- Migration systems are independent

**How do we prevent drift?**

- DOMAIN config as single source of truth
- Automated sync validation tests
- Clear documentation and workflows

**Is this the right approach?**

- ✅ Yes - it's idiomatic Drizzle
- ✅ Yes - it's maintainable with our safeguards
- ✅ Yes - it's the industry standard for multi-database projects

The slight duplication is worth it for:

- Type safety
- IDE support
- Standard tooling
- Database-specific optimizations

---

## Related Documentation

- [Database Migrations Guide](./database-migrations.md)
- [Schema Sync Test](../__tests__/db/schema-sync.test.ts)
- [DOMAIN Configuration](../src/config/domain.config.ts)
