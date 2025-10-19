import { getTableConfig } from 'drizzle-orm/sqlite-core';
import { habits, habitEntries, reminders, devices, outbox } from '../../../../src/db/sqlite/schema';

describe('Database Schema', () => {
  describe('habits table', () => {
    it('should have correct table name', () => {
      expect(habits).toBeDefined();
      const config = getTableConfig(habits);
      expect(config.name).toBe('habits');
    });

    it('should have all required columns', () => {
      const columns = Object.keys(habits);

      expect(columns).toContain('id');
      expect(columns).toContain('userId');
      expect(columns).toContain('name');
      expect(columns).toContain('cadence');
      expect(columns).toContain('color');
      expect(columns).toContain('sortOrder');
      expect(columns).toContain('isArchived');
      expect(columns).toContain('createdAt');
      expect(columns).toContain('updatedAt');
      expect(columns).toContain('version');
      expect(columns).toContain('deletedAt');
    });

    it('should have user updated index', () => {
      const config = getTableConfig(habits);
      expect(config.indexes).toBeDefined();
      expect(config.indexes.length).toBeGreaterThan(0);

      // Check if the index exists (exact property depends on Drizzle version)
      const hasUserUpdatedIdx = config.indexes.some((idx) => {
        // Index config might be nested or directly accessible
        const indexName = (idx as any).config?.name || (idx as any).name;
        return indexName === 'habits_user_updated_idx';
      });
      expect(hasUserUpdatedIdx).toBe(true);
    });

    it('should have id as primary key', () => {
      expect(habits.id).toBeDefined();
      expect(habits.id.primary).toBe(true);
    });

    it('should have userId as not null', () => {
      expect(habits.userId).toBeDefined();
      expect(habits.userId.notNull).toBe(true);
    });

    it('should have name as not null', () => {
      expect(habits.name).toBeDefined();
      expect(habits.name.notNull).toBe(true);
    });

    it('should have cadence as not null', () => {
      expect(habits.cadence).toBeDefined();
      expect(habits.cadence.notNull).toBe(true);
    });

    it('should have color as not null', () => {
      expect(habits.color).toBeDefined();
      expect(habits.color.notNull).toBe(true);
    });

    it('should have sortOrder with default value', () => {
      expect(habits.sortOrder).toBeDefined();
      expect(habits.sortOrder.default).toBe(0);
      expect(habits.sortOrder.notNull).toBe(true);
    });

    it('should have isArchived as boolean with default false', () => {
      expect(habits.isArchived).toBeDefined();
      expect(habits.isArchived.default).toBe(false);
      expect(habits.isArchived.notNull).toBe(true);
    });

    it('should have version with default value', () => {
      expect(habits.version).toBeDefined();
      expect(habits.version.default).toBe(1);
      expect(habits.version.notNull).toBe(true);
    });

    it('should have timestamp columns', () => {
      expect(habits.createdAt).toBeDefined();
      expect(habits.updatedAt).toBeDefined();
      expect(habits.createdAt.notNull).toBe(true);
      expect(habits.updatedAt.notNull).toBe(true);
    });

    it('should have optional deletedAt', () => {
      expect(habits.deletedAt).toBeDefined();
      // Optional column should not have notNull
    });
  });

  describe('habitEntries table', () => {
    it('should have correct table name', () => {
      expect(habitEntries).toBeDefined();
      const config = getTableConfig(habitEntries);
      expect(config.name).toBe('habit_entries');
    });

    it('should have all required columns', () => {
      const columns = Object.keys(habitEntries);

      expect(columns).toContain('id');
      expect(columns).toContain('userId');
      expect(columns).toContain('habitId');
      expect(columns).toContain('date');
      expect(columns).toContain('amount');
      expect(columns).toContain('source');
      expect(columns).toContain('createdAt');
      expect(columns).toContain('updatedAt');
      expect(columns).toContain('version');
      expect(columns).toContain('deletedAt');
    });

    it('should have unique index on habitId, date, deletedAt', () => {
      const config = getTableConfig(habitEntries);
      expect(config.indexes).toBeDefined();
      expect(config.indexes.length).toBeGreaterThan(0);

      const uniqueIdx = config.indexes.find((idx) => {
        const indexName = (idx as any).config?.name || (idx as any).name;
        return indexName === 'habit_entries_unique';
      });
      expect(uniqueIdx).toBeDefined();
      const isUnique = (uniqueIdx as any)?.config?.unique || (uniqueIdx as any)?.unique;
      expect(isUnique).toBe(true);
    });

    it('should have user habit index', () => {
      const config = getTableConfig(habitEntries);
      const hasUserHabitIdx = config.indexes.some((idx) => {
        const indexName = (idx as any).config?.name || (idx as any).name;
        return indexName === 'habit_entries_user_habit_idx';
      });
      expect(hasUserHabitIdx).toBe(true);
    });

    it('should have id as primary key', () => {
      expect(habitEntries.id).toBeDefined();
      expect(habitEntries.id.primary).toBe(true);
    });

    it('should have required foreign key columns', () => {
      expect(habitEntries.userId).toBeDefined();
      expect(habitEntries.userId.notNull).toBe(true);
      expect(habitEntries.habitId).toBeDefined();
      expect(habitEntries.habitId.notNull).toBe(true);
    });

    it('should have date as not null', () => {
      expect(habitEntries.date).toBeDefined();
      expect(habitEntries.date.notNull).toBe(true);
    });

    it('should have amount with default value', () => {
      expect(habitEntries.amount).toBeDefined();
      expect(habitEntries.amount.default).toBe(0);
      expect(habitEntries.amount.notNull).toBe(true);
    });

    it('should have source with default value', () => {
      expect(habitEntries.source).toBeDefined();
      expect(habitEntries.source.default).toBe('local');
      expect(habitEntries.source.notNull).toBe(true);
    });

    it('should have version with default value', () => {
      expect(habitEntries.version).toBeDefined();
      expect(habitEntries.version.default).toBe(1);
      expect(habitEntries.version.notNull).toBe(true);
    });

    it('should have timestamp columns', () => {
      expect(habitEntries.createdAt).toBeDefined();
      expect(habitEntries.updatedAt).toBeDefined();
      expect(habitEntries.createdAt.notNull).toBe(true);
      expect(habitEntries.updatedAt.notNull).toBe(true);
    });

    it('should have optional deletedAt', () => {
      expect(habitEntries.deletedAt).toBeDefined();
    });
  });

  describe('reminders table', () => {
    it('should have correct table name', () => {
      expect(reminders).toBeDefined();
      const config = getTableConfig(reminders);
      expect(config.name).toBe('reminders');
    });

    it('should have all required columns', () => {
      const columns = Object.keys(reminders);

      expect(columns).toContain('id');
      expect(columns).toContain('userId');
      expect(columns).toContain('habitId');
      expect(columns).toContain('timeLocal');
      expect(columns).toContain('daysOfWeek');
      expect(columns).toContain('timezone');
      expect(columns).toContain('isEnabled');
      expect(columns).toContain('createdAt');
      expect(columns).toContain('updatedAt');
      expect(columns).toContain('version');
      expect(columns).toContain('deletedAt');
    });

    it('should have reminders enabled index', () => {
      const config = getTableConfig(reminders);
      expect(config.indexes).toBeDefined();
      expect(config.indexes.length).toBeGreaterThan(0);

      const hasEnabledIdx = config.indexes.some((idx) => {
        const indexName = (idx as any).config?.name || (idx as any).name;
        return indexName === 'reminders_user_habit_enabled_idx';
      });
      expect(hasEnabledIdx).toBe(true);
    });

    it('should have id as primary key', () => {
      expect(reminders.id).toBeDefined();
      expect(reminders.id.primary).toBe(true);
    });

    it('should have required foreign key columns', () => {
      expect(reminders.userId).toBeDefined();
      expect(reminders.userId.notNull).toBe(true);
      expect(reminders.habitId).toBeDefined();
      expect(reminders.habitId.notNull).toBe(true);
    });

    it('should have timeLocal as not null', () => {
      expect(reminders.timeLocal).toBeDefined();
      expect(reminders.timeLocal.notNull).toBe(true);
    });

    it('should have daysOfWeek as not null', () => {
      expect(reminders.daysOfWeek).toBeDefined();
      expect(reminders.daysOfWeek.notNull).toBe(true);
    });

    it('should have timezone as not null', () => {
      expect(reminders.timezone).toBeDefined();
      expect(reminders.timezone.notNull).toBe(true);
    });

    it('should have isEnabled as boolean with default true', () => {
      expect(reminders.isEnabled).toBeDefined();
      expect(reminders.isEnabled.default).toBe(true);
      expect(reminders.isEnabled.notNull).toBe(true);
    });

    it('should have version with default value', () => {
      expect(reminders.version).toBeDefined();
      expect(reminders.version.default).toBe(1);
      expect(reminders.version.notNull).toBe(true);
    });

    it('should have timestamp columns', () => {
      expect(reminders.createdAt).toBeDefined();
      expect(reminders.updatedAt).toBeDefined();
      expect(reminders.createdAt.notNull).toBe(true);
      expect(reminders.updatedAt.notNull).toBe(true);
    });

    it('should have optional deletedAt', () => {
      expect(reminders.deletedAt).toBeDefined();
    });
  });

  describe('devices table', () => {
    it('should have correct table name', () => {
      expect(devices).toBeDefined();
      const config = getTableConfig(devices);
      expect(config.name).toBe('devices');
    });

    it('should have all required columns', () => {
      const columns = Object.keys(devices);

      expect(columns).toContain('id');
      expect(columns).toContain('userId');
      expect(columns).toContain('platform');
      expect(columns).toContain('lastSyncAt');
      expect(columns).toContain('createdAt');
      expect(columns).toContain('updatedAt');
      expect(columns).toContain('version');
      expect(columns).toContain('deletedAt');
    });

    it('should have id as primary key', () => {
      expect(devices.id).toBeDefined();
      expect(devices.id.primary).toBe(true);
    });

    it('should have userId as not null', () => {
      expect(devices.userId).toBeDefined();
      expect(devices.userId.notNull).toBe(true);
    });

    it('should have platform as not null', () => {
      expect(devices.platform).toBeDefined();
      expect(devices.platform.notNull).toBe(true);
    });

    it('should have optional lastSyncAt', () => {
      expect(devices.lastSyncAt).toBeDefined();
    });

    it('should have version with default value', () => {
      expect(devices.version).toBeDefined();
      expect(devices.version.default).toBe(1);
      expect(devices.version.notNull).toBe(true);
    });

    it('should have timestamp columns', () => {
      expect(devices.createdAt).toBeDefined();
      expect(devices.updatedAt).toBeDefined();
      expect(devices.createdAt.notNull).toBe(true);
      expect(devices.updatedAt.notNull).toBe(true);
    });

    it('should have optional deletedAt', () => {
      expect(devices.deletedAt).toBeDefined();
    });
  });

  describe('outbox table', () => {
    it('should have correct table name', () => {
      expect(outbox).toBeDefined();
      const config = getTableConfig(outbox);
      expect(config.name).toBe('outbox');
    });

    it('should have all required columns', () => {
      const columns = Object.keys(outbox);

      expect(columns).toContain('id');
      expect(columns).toContain('tableName');
      expect(columns).toContain('rowId');
      expect(columns).toContain('operation');
      expect(columns).toContain('payload');
      expect(columns).toContain('version');
      expect(columns).toContain('attempts');
      expect(columns).toContain('createdAt');
    });

    it('should have id as primary key', () => {
      expect(outbox.id).toBeDefined();
      expect(outbox.id.primary).toBe(true);
    });

    it('should have tableName as not null', () => {
      expect(outbox.tableName).toBeDefined();
      expect(outbox.tableName.notNull).toBe(true);
    });

    it('should have rowId as not null', () => {
      expect(outbox.rowId).toBeDefined();
      expect(outbox.rowId.notNull).toBe(true);
    });

    it('should have operation as not null', () => {
      expect(outbox.operation).toBeDefined();
      expect(outbox.operation.notNull).toBe(true);
    });

    it('should have payload as not null', () => {
      expect(outbox.payload).toBeDefined();
      expect(outbox.payload.notNull).toBe(true);
    });

    it('should have attempts with default value', () => {
      expect(outbox.attempts).toBeDefined();
      expect(outbox.attempts.default).toBe(0);
      expect(outbox.attempts.notNull).toBe(true);
    });

    it('should have version with default value', () => {
      expect(outbox.version).toBeDefined();
      expect(outbox.version.default).toBe(1);
      expect(outbox.version.notNull).toBe(true);
    });

    it('should have createdAt timestamp', () => {
      expect(outbox.createdAt).toBeDefined();
      expect(outbox.createdAt.notNull).toBe(true);
    });
  });

  describe('Schema Consistency', () => {
    it('all tables should have id as primary key', () => {
      expect(habits.id.primary).toBe(true);
      expect(habitEntries.id.primary).toBe(true);
      expect(reminders.id.primary).toBe(true);
      expect(devices.id.primary).toBe(true);
      expect(outbox.id.primary).toBe(true);
    });

    it('user-related tables should have userId column', () => {
      expect(habits.userId).toBeDefined();
      expect(habitEntries.userId).toBeDefined();
      expect(reminders.userId).toBeDefined();
      expect(devices.userId).toBeDefined();
    });

    it('all versioned tables should have version column with default 1', () => {
      expect(habits.version.default).toBe(1);
      expect(habitEntries.version.default).toBe(1);
      expect(reminders.version.default).toBe(1);
      expect(devices.version.default).toBe(1);
      expect(outbox.version.default).toBe(1);
    });

    it('soft-deletable tables should have deletedAt column', () => {
      expect(habits.deletedAt).toBeDefined();
      expect(habitEntries.deletedAt).toBeDefined();
      expect(reminders.deletedAt).toBeDefined();
      expect(devices.deletedAt).toBeDefined();
    });

    it('timestamped tables should have createdAt and updatedAt', () => {
      expect(habits.createdAt).toBeDefined();
      expect(habits.updatedAt).toBeDefined();
      expect(habitEntries.createdAt).toBeDefined();
      expect(habitEntries.updatedAt).toBeDefined();
      expect(reminders.createdAt).toBeDefined();
      expect(reminders.updatedAt).toBeDefined();
      expect(devices.createdAt).toBeDefined();
      expect(devices.updatedAt).toBeDefined();
      expect(outbox.createdAt).toBeDefined();
    });

    it('all indexed tables should have indexes configured', () => {
      const habitsConfig = getTableConfig(habits);
      const habitEntriesConfig = getTableConfig(habitEntries);
      const remindersConfig = getTableConfig(reminders);

      expect(habitsConfig.indexes.length).toBeGreaterThan(0);
      expect(habitEntriesConfig.indexes.length).toBeGreaterThan(0);
      expect(remindersConfig.indexes.length).toBeGreaterThan(0);
    });
  });
});
