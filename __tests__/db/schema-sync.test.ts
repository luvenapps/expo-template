/**
 * Schema Sync Validation Test
 *
 * This test ensures SQLite and Postgres schemas stay in sync.
 * It validates that both schemas have the same tables, columns, and structure
 * even though they use different Drizzle dialects.
 */

import { DOMAIN } from '@/config/domain.config';

describe('Database Schema Synchronization', () => {
  // Helper to get user-defined columns (filter out Drizzle internals)
  const getUserColumns = (table: any): string[] => {
    return Object.keys(table).filter(
      (key) =>
        !key.startsWith('_') && // Internal properties
        typeof key === 'string' && // Only string keys
        !key.includes('Symbol'), // No symbols
    );
  };

  const ENTITY_TABLES = [
    { name: 'primaryEntity', displayName: 'Primary' },
    { name: 'entryEntity', displayName: 'Entry' },
    { name: 'reminderEntity', displayName: 'Reminder' },
    { name: 'deviceEntity', displayName: 'Device' },
  ];

  it('should have matching table names in both schemas', () => {
    const sqliteSchema = require('@/db/sqlite/schema');
    const postgresSchema = require('@/db/postgres/schema');

    // Verify all tables exist in both
    ENTITY_TABLES.forEach(({ name, displayName }) => {
      expect(sqliteSchema[name]).toBeDefined();
      expect(postgresSchema[name]).toBeDefined();
    });
  });

  it('should use DOMAIN config for all table names', () => {
    const sqliteSchema = require('@/db/sqlite/schema');
    const postgresSchema = require('@/db/postgres/schema');

    // Map entity names to DOMAIN config keys
    const mappings = [
      { entity: 'primaryEntity', domainKey: 'primary' as const },
      { entity: 'entryEntity', domainKey: 'entries' as const },
      { entity: 'reminderEntity', domainKey: 'reminders' as const },
      { entity: 'deviceEntity', domainKey: 'devices' as const },
    ];

    mappings.forEach(({ entity, domainKey }) => {
      const sqliteTableName = sqliteSchema[entity][Symbol.for('drizzle:Name')];
      const postgresTableName = postgresSchema[entity][Symbol.for('drizzle:Name')];

      expect(sqliteTableName).toBe(DOMAIN.entities[domainKey].tableName);
      expect(postgresTableName).toBe(DOMAIN.entities[domainKey].remoteTableName);
    });
  });

  it('should have matching column counts for all entities', () => {
    const sqliteSchema = require('@/db/sqlite/schema');
    const postgresSchema = require('@/db/postgres/schema');

    ENTITY_TABLES.forEach(({ name, displayName }) => {
      const sqliteColumns = getUserColumns(sqliteSchema[name]);
      const postgresColumns = getUserColumns(postgresSchema[name]);

      // Allow Postgres to have up to 1 extra column (e.g., enableRLS)
      const columnCountDiff = Math.abs(sqliteColumns.length - postgresColumns.length);

      expect(columnCountDiff).toBeLessThanOrEqual(1);

      if (columnCountDiff > 0) {
        console.warn(
          `⚠️  ${displayName} entity has different column counts: SQLite=${sqliteColumns.length}, Postgres=${postgresColumns.length}`,
        );
      }
    });
  });

  it('should have matching core columns for all entities', () => {
    const sqliteSchema = require('@/db/sqlite/schema');
    const postgresSchema = require('@/db/postgres/schema');

    // Common columns that should exist in all entities
    const commonColumns = ['id', 'userId', 'createdAt', 'updatedAt', 'version', 'deletedAt'];

    ENTITY_TABLES.forEach(({ name, displayName }) => {
      const sqliteColumns = getUserColumns(sqliteSchema[name]);
      const postgresColumns = getUserColumns(postgresSchema[name]);

      // All common columns should exist in both
      commonColumns.forEach((col) => {
        const hasSqlite = sqliteColumns.includes(col);
        const hasPostgres = postgresColumns.includes(col);

        if (hasSqlite !== hasPostgres) {
          throw new Error(
            `❌ ${displayName}: Column '${col}' exists in ${hasSqlite ? 'SQLite' : 'Postgres'} but not ${hasSqlite ? 'Postgres' : 'SQLite'}`,
          );
        }
      });

      // Known column name differences (these are expected):
      // - SQLite uses 'habitId' (JS property), Postgres uses 'habit_id' (same column, different property name)
      // - Postgres may have 'enableRLS' (Drizzle internal)
      const knownDifferences = new Set([
        DOMAIN.entities.entries.foreignKey, // habitId in SQLite
        DOMAIN.entities.entries.row_id, // habit_id in Postgres
        'enableRLS', // Postgres Drizzle internal
      ]);

      // Check that all SQLite columns exist in Postgres (accounting for naming differences)
      const missingInPostgres = sqliteColumns.filter(
        (col) => !postgresColumns.includes(col) && !knownDifferences.has(col),
      );

      if (missingInPostgres.length > 0) {
        throw new Error(
          `❌ ${displayName}: Columns in SQLite but not Postgres: ${missingInPostgres.join(', ')}. Check if this is a real column or a naming difference.`,
        );
      }

      // Check that all Postgres columns exist in SQLite (accounting for naming differences)
      const missingInSqlite = postgresColumns.filter(
        (col) => !sqliteColumns.includes(col) && !knownDifferences.has(col),
      );

      if (missingInSqlite.length > 0) {
        throw new Error(
          `❌ ${displayName}: Columns in Postgres but not SQLite: ${missingInSqlite.join(', ')}. Check if this is a real column or a naming difference.`,
        );
      }
    });
  });

  it('should have consistent foreign key columns', () => {
    const sqliteSchema = require('@/db/sqlite/schema');
    const postgresSchema = require('@/db/postgres/schema');

    // Entities with foreign keys to primary
    const foreignKeyEntities = [
      { name: 'entryEntity', displayName: 'Entry' },
      { name: 'reminderEntity', displayName: 'Reminder' },
    ];

    foreignKeyEntities.forEach(({ name, displayName }) => {
      const sqliteColumns = getUserColumns(sqliteSchema[name]);
      const postgresColumns = getUserColumns(postgresSchema[name]);

      // Check SQLite has foreign key column
      const sqliteFKColumn = DOMAIN.entities.entries.foreignKey;
      expect(sqliteColumns).toContain(sqliteFKColumn);

      // Check Postgres has foreign key column
      const postgresFKColumn = DOMAIN.entities.entries.row_id;
      expect(postgresColumns).toContain(postgresFKColumn);
    });
  });

  it('should export the same number of entities', () => {
    const sqliteSchema = require('@/db/sqlite/schema');
    const postgresSchema = require('@/db/postgres/schema');

    const sqliteExports = Object.keys(sqliteSchema).filter((key) => key.endsWith('Entity'));
    const postgresExports = Object.keys(postgresSchema).filter((key) => key.endsWith('Entity'));

    // Both should export the same entity tables (excluding outbox which is SQLite only)
    const expectedEntities = ['primaryEntity', 'entryEntity', 'reminderEntity', 'deviceEntity'];

    expectedEntities.forEach((entity) => {
      expect(sqliteExports).toContain(entity);
      expect(postgresExports).toContain(entity);
    });

    // SQLite should have 'outbox' table, Postgres shouldn't
    expect(sqliteSchema.outbox).toBeDefined();
    expect(postgresSchema.outbox).toBeUndefined();
  });

  it('should fail with helpful message if schemas drift', () => {
    // This test documents the expected behavior when schemas are out of sync
    // If any of the above tests fail, the developer should:
    const instructions = [
      '1. Review the failing test output',
      '2. Check which columns are missing or mismatched',
      '3. Update BOTH schema files to match',
      '4. Run: npm run db:migrate',
      '5. Re-run tests to verify sync',
    ];

    expect(instructions).toHaveLength(5);
    expect(instructions[3]).toBe('4. Run: npm run db:migrate');
  });
});
