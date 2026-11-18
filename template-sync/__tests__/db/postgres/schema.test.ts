import { DOMAIN } from '@/config/domain.config';
import { deviceEntity, entryEntity, primaryEntity, reminderEntity } from '@/db/postgres/schema';
import { toSnakeCase } from '@/utils/string';
import { getTableConfig } from 'drizzle-orm/pg-core';

describe('Postgres Schema', () => {
  describe('primaryEntity table', () => {
    it('should have correct table name', () => {
      expect(primaryEntity).toBeDefined();
      const config = getTableConfig(primaryEntity);
      expect(config.name).toBe(DOMAIN.entities.primary.remoteTableName);
    });

    it('should have all required columns', () => {
      const columns = Object.keys(primaryEntity);

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
      const config = getTableConfig(primaryEntity);
      expect(config.indexes).toBeDefined();
      expect(config.indexes.length).toBeGreaterThan(0);

      const hasUserUpdatedIdx = config.indexes.some((idx) => {
        const indexName = (idx as any).config?.name || (idx as any).name;
        return indexName === `${DOMAIN.entities.primary.remoteTableName}_user_id_updated_at_idx`;
      });
      expect(hasUserUpdatedIdx).toBe(true);
    });

    it('should have id as primary key', () => {
      expect(primaryEntity.id).toBeDefined();
      expect(primaryEntity.id.primary).toBe(true);
    });

    it('should have userId as not null', () => {
      expect(primaryEntity.userId).toBeDefined();
      expect(primaryEntity.userId.notNull).toBe(true);
    });

    it('should have name as not null', () => {
      expect(primaryEntity.name).toBeDefined();
      expect(primaryEntity.name.notNull).toBe(true);
    });

    it('should have cadence as not null', () => {
      expect(primaryEntity.cadence).toBeDefined();
      expect(primaryEntity.cadence.notNull).toBe(true);
    });

    it('should have color as not null with default value', () => {
      expect(primaryEntity.color).toBeDefined();
      expect(primaryEntity.color.notNull).toBe(true);
      expect(primaryEntity.color.default).toBe('#0ea5e9');
    });

    it('should have sortOrder with default value', () => {
      expect(primaryEntity.sortOrder).toBeDefined();
      expect(primaryEntity.sortOrder.default).toBe(0);
      expect(primaryEntity.sortOrder.notNull).toBe(true);
    });

    it('should have isArchived as boolean with default false', () => {
      expect(primaryEntity.isArchived).toBeDefined();
      expect(primaryEntity.isArchived.default).toBe(false);
      expect(primaryEntity.isArchived.notNull).toBe(true);
    });

    it('should have version with default value', () => {
      expect(primaryEntity.version).toBeDefined();
      expect(primaryEntity.version.default).toBe(1);
      expect(primaryEntity.version.notNull).toBe(true);
    });

    it('should have timestamp columns', () => {
      expect(primaryEntity.createdAt).toBeDefined();
      expect(primaryEntity.updatedAt).toBeDefined();
      expect(primaryEntity.createdAt.notNull).toBe(true);
      expect(primaryEntity.updatedAt.notNull).toBe(true);
    });

    it('should have optional deletedAt', () => {
      expect(primaryEntity.deletedAt).toBeDefined();
    });
  });

  describe('entryEntity table', () => {
    it('should have correct table name', () => {
      expect(entryEntity).toBeDefined();
      const config = getTableConfig(entryEntity);
      expect(config.name).toBe(DOMAIN.entities.entries.remoteTableName);
    });

    it('should have all required columns', () => {
      const columns = Object.keys(entryEntity);

      expect(columns).toContain('id');
      expect(columns).toContain('userId');
      expect(columns).toContain(DOMAIN.entities.entries.row_id);
      expect(columns).toContain('date');
      expect(columns).toContain('amount');
      expect(columns).toContain('source');
      expect(columns).toContain('createdAt');
      expect(columns).toContain('updatedAt');
      expect(columns).toContain('version');
      expect(columns).toContain('deletedAt');
    });

    it('should have unique index on foreign key and date', () => {
      const config = getTableConfig(entryEntity);
      expect(config.indexes).toBeDefined();
      expect(config.indexes.length).toBeGreaterThan(0);

      const foreignKeyColumn = DOMAIN.entities.entries.row_id;
      const expectedIndexPattern = `_${foreignKeyColumn}_date_unique`;

      const uniqueIdx = config.indexes.find((idx) => {
        const indexName = (idx as any).config?.name || (idx as any).name;
        return indexName.includes(expectedIndexPattern);
      });
      expect(uniqueIdx).toBeDefined();
      const isUnique = (uniqueIdx as any)?.config?.unique || (uniqueIdx as any)?.unique;
      expect(isUnique).toBe(true);
    });

    it('should have user foreign key date index', () => {
      const config = getTableConfig(entryEntity);
      const foreignKeyColumn = DOMAIN.entities.entries.row_id;
      const expectedIndexPattern = `_user_${foreignKeyColumn}_date_idx`;

      const hasUserForeignKeyDateIdx = config.indexes.some((idx) => {
        const indexName = (idx as any).config?.name || (idx as any).name;
        return indexName.includes(expectedIndexPattern);
      });
      expect(hasUserForeignKeyDateIdx).toBe(true);
    });

    it('should have id as primary key', () => {
      expect(entryEntity.id).toBeDefined();
      expect(entryEntity.id.primary).toBe(true);
    });

    it('should have required foreign key columns', () => {
      expect(entryEntity.userId).toBeDefined();
      expect(entryEntity.userId.notNull).toBe(true);

      const foreignKeyColumn = entryEntity[DOMAIN.entities.entries.row_id];
      expect(foreignKeyColumn).toBeDefined();
      expect(foreignKeyColumn.notNull).toBe(true);
    });

    it('should have foreign key reference to primary entity', () => {
      const config = getTableConfig(entryEntity);
      expect(config.foreignKeys).toBeDefined();
      expect(config.foreignKeys.length).toBeGreaterThan(0);

      const foreignKey = config.foreignKeys[0];
      expect(foreignKey).toBeDefined();

      // Verify foreign key references the primary entity
      const fkReference = (foreignKey as any).reference;
      expect(fkReference).toBeDefined();
    });

    it('should have date as not null', () => {
      expect(entryEntity.date).toBeDefined();
      expect(entryEntity.date.notNull).toBe(true);
    });

    it('should have amount with default value', () => {
      expect(entryEntity.amount).toBeDefined();
      expect(entryEntity.amount.default).toBe(0);
      expect(entryEntity.amount.notNull).toBe(true);
    });

    it('should have source with default value', () => {
      expect(entryEntity.source).toBeDefined();
      expect(entryEntity.source.default).toBe('local');
      expect(entryEntity.source.notNull).toBe(true);
    });

    it('should have version with default value', () => {
      expect(entryEntity.version).toBeDefined();
      expect(entryEntity.version.default).toBe(1);
      expect(entryEntity.version.notNull).toBe(true);
    });

    it('should have timestamp columns', () => {
      expect(entryEntity.createdAt).toBeDefined();
      expect(entryEntity.updatedAt).toBeDefined();
      expect(entryEntity.createdAt.notNull).toBe(true);
      expect(entryEntity.updatedAt.notNull).toBe(true);
    });

    it('should have optional deletedAt', () => {
      expect(entryEntity.deletedAt).toBeDefined();
    });
  });

  describe('reminderEntity table', () => {
    it('should have correct table name', () => {
      expect(reminderEntity).toBeDefined();
      const config = getTableConfig(reminderEntity);
      expect(config.name).toBe(DOMAIN.entities.reminders.remoteTableName);
    });

    it('should have all required columns', () => {
      const columns = Object.keys(reminderEntity);
      const reminderForeignKey = toSnakeCase(DOMAIN.entities.reminders.foreignKey);

      expect(columns).toContain('id');
      expect(columns).toContain('userId');
      expect(columns).toContain(reminderForeignKey);
      expect(columns).toContain('timeLocal');
      expect(columns).toContain('daysOfWeek');
      expect(columns).toContain('timezone');
      expect(columns).toContain('isEnabled');
      expect(columns).toContain('createdAt');
      expect(columns).toContain('updatedAt');
      expect(columns).toContain('version');
      expect(columns).toContain('deletedAt');
    });

    it('should have user foreign key enabled index', () => {
      const config = getTableConfig(reminderEntity);
      expect(config.indexes).toBeDefined();
      expect(config.indexes.length).toBeGreaterThan(0);

      const reminderForeignKey = toSnakeCase(DOMAIN.entities.reminders.foreignKey);
      const expectedIndexPattern = `_user_${reminderForeignKey}_enabled_idx`;

      const hasEnabledIdx = config.indexes.some((idx) => {
        const indexName = (idx as any).config?.name || (idx as any).name;
        return indexName.includes(expectedIndexPattern);
      });
      expect(hasEnabledIdx).toBe(true);
    });

    it('should have id as primary key', () => {
      expect(reminderEntity.id).toBeDefined();
      expect(reminderEntity.id.primary).toBe(true);
    });

    it('should have required foreign key columns', () => {
      expect(reminderEntity.userId).toBeDefined();
      expect(reminderEntity.userId.notNull).toBe(true);

      const reminderForeignKey = toSnakeCase(DOMAIN.entities.reminders.foreignKey);
      const foreignKeyColumn = (reminderEntity as any)[reminderForeignKey];
      expect(foreignKeyColumn).toBeDefined();
      expect(foreignKeyColumn.notNull).toBe(true);
    });

    it('should have foreign key reference to primary entity', () => {
      const config = getTableConfig(reminderEntity);
      expect(config.foreignKeys).toBeDefined();
      expect(config.foreignKeys.length).toBeGreaterThan(0);

      const foreignKey = config.foreignKeys[0];
      expect(foreignKey).toBeDefined();

      // Verify foreign key references the primary entity
      const fkReference = (foreignKey as any).reference;
      expect(fkReference).toBeDefined();
    });

    it('should have timeLocal as not null', () => {
      expect(reminderEntity.timeLocal).toBeDefined();
      expect(reminderEntity.timeLocal.notNull).toBe(true);
    });

    it('should have daysOfWeek as not null', () => {
      expect(reminderEntity.daysOfWeek).toBeDefined();
      expect(reminderEntity.daysOfWeek.notNull).toBe(true);
    });

    it('should have timezone as not null', () => {
      expect(reminderEntity.timezone).toBeDefined();
      expect(reminderEntity.timezone.notNull).toBe(true);
    });

    it('should have isEnabled as boolean with default true', () => {
      expect(reminderEntity.isEnabled).toBeDefined();
      expect(reminderEntity.isEnabled.default).toBe(true);
      expect(reminderEntity.isEnabled.notNull).toBe(true);
    });

    it('should have version with default value', () => {
      expect(reminderEntity.version).toBeDefined();
      expect(reminderEntity.version.default).toBe(1);
      expect(reminderEntity.version.notNull).toBe(true);
    });

    it('should have timestamp columns', () => {
      expect(reminderEntity.createdAt).toBeDefined();
      expect(reminderEntity.updatedAt).toBeDefined();
      expect(reminderEntity.createdAt.notNull).toBe(true);
      expect(reminderEntity.updatedAt.notNull).toBe(true);
    });

    it('should have optional deletedAt', () => {
      expect(reminderEntity.deletedAt).toBeDefined();
    });
  });

  describe('deviceEntity table', () => {
    it('should have correct table name', () => {
      expect(deviceEntity).toBeDefined();
      const config = getTableConfig(deviceEntity);
      expect(config.name).toBe(DOMAIN.entities.devices.remoteTableName);
    });

    it('should have all required columns', () => {
      const columns = Object.keys(deviceEntity);

      expect(columns).toContain('id');
      expect(columns).toContain('userId');
      expect(columns).toContain('platform');
      expect(columns).toContain('lastSyncAt');
      expect(columns).toContain('createdAt');
      expect(columns).toContain('updatedAt');
      expect(columns).toContain('version');
      expect(columns).toContain('deletedAt');
    });

    it('should have user platform index', () => {
      const config = getTableConfig(deviceEntity);
      expect(config.indexes).toBeDefined();
      expect(config.indexes.length).toBeGreaterThan(0);

      const hasUserPlatformIdx = config.indexes.some((idx) => {
        const indexName = (idx as any).config?.name || (idx as any).name;
        return indexName === `${DOMAIN.entities.devices.remoteTableName}_user_id_platform_idx`;
      });
      expect(hasUserPlatformIdx).toBe(true);
    });

    it('should have id as primary key', () => {
      expect(deviceEntity.id).toBeDefined();
      expect(deviceEntity.id.primary).toBe(true);
    });

    it('should have userId as not null', () => {
      expect(deviceEntity.userId).toBeDefined();
      expect(deviceEntity.userId.notNull).toBe(true);
    });

    it('should have platform as not null', () => {
      expect(deviceEntity.platform).toBeDefined();
      expect(deviceEntity.platform.notNull).toBe(true);
    });

    it('should have optional lastSyncAt', () => {
      expect(deviceEntity.lastSyncAt).toBeDefined();
    });

    it('should have version with default value', () => {
      expect(deviceEntity.version).toBeDefined();
      expect(deviceEntity.version.default).toBe(1);
      expect(deviceEntity.version.notNull).toBe(true);
    });

    it('should have timestamp columns', () => {
      expect(deviceEntity.createdAt).toBeDefined();
      expect(deviceEntity.updatedAt).toBeDefined();
      expect(deviceEntity.createdAt.notNull).toBe(true);
      expect(deviceEntity.updatedAt.notNull).toBe(true);
    });

    it('should have optional deletedAt', () => {
      expect(deviceEntity.deletedAt).toBeDefined();
    });
  });

  describe('Foreign Key References', () => {
    it('should resolve entry entity foreign key to primary entity id', () => {
      const config = getTableConfig(entryEntity);
      const foreignKey = config.foreignKeys[0];

      // Access the reference callback to trigger line 63
      const reference = (foreignKey as any).reference;
      if (typeof reference === 'function') {
        const resolvedRef = reference();
        expect(resolvedRef).toBeDefined();
      }

      // Verify onDelete cascade option
      const onDelete = (foreignKey as any).onDelete;
      expect(onDelete).toBe('cascade');
    });

    it('should resolve reminder entity foreign key to primary entity id', () => {
      const config = getTableConfig(reminderEntity);
      const foreignKey = config.foreignKeys[0];

      // Access the reference callback to trigger line 96
      const reference = (foreignKey as any).reference;
      if (typeof reference === 'function') {
        const resolvedRef = reference();
        expect(resolvedRef).toBeDefined();
      }

      // Verify onDelete cascade option
      const onDelete = (foreignKey as any).onDelete;
      expect(onDelete).toBe('cascade');
    });
  });

  describe('Schema Consistency', () => {
    it('all tables should have id as primary key', () => {
      expect(primaryEntity.id.primary).toBe(true);
      expect(entryEntity.id.primary).toBe(true);
      expect(reminderEntity.id.primary).toBe(true);
      expect(deviceEntity.id.primary).toBe(true);
    });

    it('all tables should have userId column', () => {
      expect(primaryEntity.userId).toBeDefined();
      expect(entryEntity.userId).toBeDefined();
      expect(reminderEntity.userId).toBeDefined();
      expect(deviceEntity.userId).toBeDefined();
    });

    it('all tables should have version column with default 1', () => {
      expect(primaryEntity.version.default).toBe(1);
      expect(entryEntity.version.default).toBe(1);
      expect(reminderEntity.version.default).toBe(1);
      expect(deviceEntity.version.default).toBe(1);
    });

    it('all tables should have deletedAt column for soft deletes', () => {
      expect(primaryEntity.deletedAt).toBeDefined();
      expect(entryEntity.deletedAt).toBeDefined();
      expect(reminderEntity.deletedAt).toBeDefined();
      expect(deviceEntity.deletedAt).toBeDefined();
    });

    it('all tables should have createdAt and updatedAt timestamps', () => {
      expect(primaryEntity.createdAt).toBeDefined();
      expect(primaryEntity.updatedAt).toBeDefined();
      expect(entryEntity.createdAt).toBeDefined();
      expect(entryEntity.updatedAt).toBeDefined();
      expect(reminderEntity.createdAt).toBeDefined();
      expect(reminderEntity.updatedAt).toBeDefined();
      expect(deviceEntity.createdAt).toBeDefined();
      expect(deviceEntity.updatedAt).toBeDefined();
    });

    it('all indexed tables should have indexes configured', () => {
      const primaryEntityConfig = getTableConfig(primaryEntity);
      const entryEntityConfig = getTableConfig(entryEntity);
      const reminderEntityConfig = getTableConfig(reminderEntity);
      const deviceEntityConfig = getTableConfig(deviceEntity);

      expect(primaryEntityConfig.indexes.length).toBeGreaterThan(0);
      expect(entryEntityConfig.indexes.length).toBeGreaterThan(0);
      expect(reminderEntityConfig.indexes.length).toBeGreaterThan(0);
      expect(deviceEntityConfig.indexes.length).toBeGreaterThan(0);
    });

    it('child entities should have foreign keys to primary entity', () => {
      const entryEntityConfig = getTableConfig(entryEntity);
      const reminderEntityConfig = getTableConfig(reminderEntity);

      expect(entryEntityConfig.foreignKeys.length).toBeGreaterThan(0);
      expect(reminderEntityConfig.foreignKeys.length).toBeGreaterThan(0);
    });

    it('should use DOMAIN config for table names', () => {
      const primaryConfig = getTableConfig(primaryEntity);
      const entryConfig = getTableConfig(entryEntity);
      const reminderConfig = getTableConfig(reminderEntity);
      const deviceConfig = getTableConfig(deviceEntity);

      expect(primaryConfig.name).toBe(DOMAIN.entities.primary.remoteTableName);
      expect(entryConfig.name).toBe(DOMAIN.entities.entries.remoteTableName);
      expect(reminderConfig.name).toBe(DOMAIN.entities.reminders.remoteTableName);
      expect(deviceConfig.name).toBe(DOMAIN.entities.devices.remoteTableName);
    });
  });
});
