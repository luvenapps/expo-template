/**
 * Migration File Validation Tests
 *
 * This test validates that generated migration files contain all required elements.
 * It ensures developers review migrations properly before committing.
 *
 * What's validated:
 * 1. ✅ All expected tables are created
 * 2. ✅ RLS policies are present for all tables
 * 3. ✅ Partial index has WHERE clause (Drizzle post-processing)
 * 4. ✅ Foreign keys are defined
 * 5. ✅ Required indexes exist
 * 6. ✅ DOMAIN config table names are used
 */

import fs from 'node:fs';
import path from 'node:path';
import { DOMAIN } from '@/config/domain.config';

describe('Migration File Validation', () => {
  const migrationsDir = path.join(process.cwd(), 'supabase/migrations');
  let latestMigration: string;
  let migrationContent: string;

  beforeAll(() => {
    // Find the latest migration file
    const migrations = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort()
      .reverse();

    expect(migrations.length).toBeGreaterThan(0);
    latestMigration = migrations[0];
    migrationContent = fs.readFileSync(path.join(migrationsDir, latestMigration), 'utf8');
  });

  describe('Table Creation', () => {
    it('should create all entity tables from DOMAIN config', () => {
      const expectedTables = [
        DOMAIN.entities.primary.remoteTableName, // habits
        DOMAIN.entities.entries.remoteTableName, // habit_entries
        DOMAIN.entities.reminders.remoteTableName, // reminders
        DOMAIN.entities.devices.remoteTableName, // devices
      ];

      for (const tableName of expectedTables) {
        expect(migrationContent).toMatch(new RegExp(`CREATE TABLE "${tableName}"`, 'i'));
      }
    });

    it('should include required columns for all tables', () => {
      const requiredColumns = [
        'id',
        'user_id',
        'created_at',
        'updated_at',
        'version',
        'deleted_at',
      ];

      // Check that each required column appears at least 4 times (once per table)
      for (const column of requiredColumns) {
        const regex = new RegExp(`"${column}"`, 'g');
        const matches = migrationContent.match(regex);
        expect(matches).not.toBeNull();
        expect(matches!.length).toBeGreaterThanOrEqual(4);
      }
    });
  });

  describe('Foreign Keys', () => {
    it('should define foreign key from entries to primary entity', () => {
      const entriesTable = DOMAIN.entities.entries.remoteTableName;
      const primaryTable = DOMAIN.entities.primary.remoteTableName;
      const foreignKey = DOMAIN.entities.entries.row_id; // habit_id

      expect(migrationContent).toMatch(
        new RegExp(
          `ALTER TABLE "${entriesTable}" ADD CONSTRAINT.*"${foreignKey}".*REFERENCES.*"${primaryTable}"`,
          'i',
        ),
      );
    });

    it('should define foreign key from reminders to primary entity', () => {
      const remindersTable = DOMAIN.entities.reminders.remoteTableName;
      const primaryTable = DOMAIN.entities.primary.remoteTableName;
      // reminders uses habit_id column (derived from foreignKey in camelCase to snake_case)
      const foreignKey = 'habit_id';

      expect(migrationContent).toMatch(
        new RegExp(
          `ALTER TABLE "${remindersTable}" ADD CONSTRAINT.*"${foreignKey}".*REFERENCES.*"${primaryTable}"`,
          'i',
        ),
      );
    });

    it('should use CASCADE delete for foreign keys', () => {
      const cascadeMatches = migrationContent.match(/ON DELETE cascade/gi);
      expect(cascadeMatches).not.toBeNull();
      expect(cascadeMatches!.length).toBeGreaterThanOrEqual(2); // entries + reminders
    });
  });

  describe('Indexes', () => {
    it('should create partial unique index with WHERE clause for entries', () => {
      // This validates the post-processing step in generate-postgres-migration.mjs
      const partialIndexRegex =
        /CREATE UNIQUE INDEX "habit_entries_habit_id_date_unique".*WHERE deleted_at IS NULL/i;
      expect(migrationContent).toMatch(partialIndexRegex);
    });

    it('should create user_id indexes for query performance', () => {
      const expectedIndexes = [
        'devices_user_id_platform_idx',
        'habit_entries_user_habit_id_date_idx',
        'habits_user_id_updated_at_idx',
        'reminders_user_habit_id_enabled_idx',
      ];

      for (const indexName of expectedIndexes) {
        expect(migrationContent).toMatch(new RegExp(`CREATE.*INDEX "${indexName}"`, 'i'));
      }
    });
  });

  describe('Row Level Security (RLS)', () => {
    it('should enable RLS on all tables', () => {
      const expectedTables = [
        DOMAIN.entities.primary.remoteTableName,
        DOMAIN.entities.entries.remoteTableName,
        DOMAIN.entities.reminders.remoteTableName,
        DOMAIN.entities.devices.remoteTableName,
      ];

      for (const tableName of expectedTables) {
        expect(migrationContent).toMatch(
          new RegExp(`alter table public\\.${tableName} enable row level security`, 'i'),
        );
      }
    });

    it('should create RLS policies for all tables', () => {
      const expectedTables = [
        DOMAIN.entities.primary.remoteTableName,
        DOMAIN.entities.entries.remoteTableName,
        DOMAIN.entities.reminders.remoteTableName,
        DOMAIN.entities.devices.remoteTableName,
      ];

      for (const tableName of expectedTables) {
        expect(migrationContent).toMatch(
          new RegExp(`create policy "Users can manage their own ${tableName}"`, 'i'),
        );
      }
    });

    it('should use auth.uid() = user_id for RLS policies', () => {
      // Ensure all policies use the correct security model
      const policyMatches = migrationContent.match(/using \(auth\.uid\(\) = user_id\)/gi);
      expect(policyMatches).not.toBeNull();
      expect(policyMatches!.length).toBe(4); // One per table

      const checkMatches = migrationContent.match(/with check \(auth\.uid\(\) = user_id\)/gi);
      expect(checkMatches).not.toBeNull();
      expect(checkMatches!.length).toBe(4); // One per table
    });

    it('should include RLS policy drop statements for re-running migrations', () => {
      const dropPolicyMatches = migrationContent.match(/drop policy if exists/gi);
      expect(dropPolicyMatches).not.toBeNull();
      expect(dropPolicyMatches!.length).toBe(4); // One per table
    });
  });

  describe('Migration Quality', () => {
    it('should include auto-generation warning comment', () => {
      expect(migrationContent).toMatch(/This file is auto-generated from DOMAIN config/i);
      expect(migrationContent).toMatch(/DO NOT EDIT MANUALLY/i);
    });

    it('should not contain hardcoded non-DOMAIN table names', () => {
      // Ensure all table names come from DOMAIN config
      const validTableNames = [
        DOMAIN.entities.primary.remoteTableName,
        DOMAIN.entities.entries.remoteTableName,
        DOMAIN.entities.reminders.remoteTableName,
        DOMAIN.entities.devices.remoteTableName,
      ];

      // If migration contains CREATE TABLE or RLS for a table not in DOMAIN, fail
      const tableMatches = migrationContent.matchAll(
        /(?:CREATE TABLE|alter table public\.|on public\.)"?(\w+)"?/gi,
      );
      for (const match of tableMatches) {
        const tableName = match[1];
        expect(validTableNames).toContain(tableName);
      }
    });

    it('should use Postgres data types correctly', () => {
      // Ensure we're using uuid (not text), timestamp with time zone, etc.
      expect(migrationContent).toMatch(/uuid PRIMARY KEY/i);
      expect(migrationContent).toMatch(/timestamp with time zone/i);
      expect(migrationContent).toMatch(/bigint DEFAULT 1 NOT NULL/i); // version
    });
  });

  describe('DOMAIN Config Consistency', () => {
    it('should match primary entity name from DOMAIN', () => {
      const tableName = DOMAIN.entities.primary.remoteTableName;
      expect(migrationContent).toContain(`CREATE TABLE "${tableName}"`);
      expect(migrationContent).toContain(
        `alter table public.${tableName} enable row level security`,
      );
    });

    it('should match entries entity name from DOMAIN', () => {
      const tableName = DOMAIN.entities.entries.remoteTableName;
      expect(migrationContent).toContain(`CREATE TABLE "${tableName}"`);
      expect(migrationContent).toContain(
        `alter table public.${tableName} enable row level security`,
      );
    });

    it('should match foreign key column names from DOMAIN', () => {
      const habitIdColumn = DOMAIN.entities.entries.row_id; // "habit_id"
      expect(migrationContent).toMatch(new RegExp(`"${habitIdColumn}".*REFERENCES`, 'i'));
    });
  });
});
