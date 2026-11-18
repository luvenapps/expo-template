import { DOMAIN } from '@/config/domain.config';
import {
  mapRemoteDeviceEntities,
  mapRemoteEntryEntities,
  mapRemotePrimaryEntities,
  mapRemoteReminderEntities,
} from '@/supabase/remoteMappers';
import { toSnakeCase } from '@/utils/string';

describe('remoteMappers', () => {
  describe('mapRemotePrimaryEntities', () => {
    it('returns empty array when rows is undefined', () => {
      expect(mapRemotePrimaryEntities(undefined)).toEqual([]);
    });

    it('returns empty array when rows is empty', () => {
      expect(mapRemotePrimaryEntities([])).toEqual([]);
    });

    it('filters out rows without id', () => {
      const rows = [
        { user_id: 'user-1', name: 'Test' },
        { id: 'id-1', user_id: 'user-1', name: 'Valid' },
      ];
      const result = mapRemotePrimaryEntities(rows);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('id-1');
    });

    it('filters out rows without user_id', () => {
      const rows = [
        { id: 'id-1', name: 'Test' },
        { id: 'id-2', user_id: 'user-1', name: 'Valid' },
      ];
      const result = mapRemotePrimaryEntities(rows);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('id-2');
    });

    it('maps valid remote row to domain object', () => {
      const rows = [
        {
          id: 'remote-1',
          user_id: 'user-1',
          name: 'Exercise',
          cadence: 'daily',
          color: '#ff0000',
          sort_order: 5,
          is_archived: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          version: 3,
          deleted_at: '2024-01-03T00:00:00Z',
        },
      ];

      const result = mapRemotePrimaryEntities(rows);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'remote-1',
        userId: 'user-1',
        name: 'Exercise',
        cadence: 'daily',
        color: '#ff0000',
        sortOrder: 5,
        isArchived: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        version: 3,
        deletedAt: '2024-01-03T00:00:00Z',
      });
    });

    it('uses default values for missing optional fields', () => {
      const rows = [
        {
          id: 'remote-1',
          user_id: 'user-1',
        },
      ];

      const result = mapRemotePrimaryEntities(rows);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'remote-1',
        userId: 'user-1',
        name: '',
        cadence: 'daily',
        color: '#ffffff',
        sortOrder: 0,
        isArchived: false,
        version: 1,
        deletedAt: null,
      });
      expect(result[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(result[0].updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('sets deletedAt to null when not present', () => {
      const rows = [{ id: 'id-1', user_id: 'user-1' }];
      const result = mapRemotePrimaryEntities(rows);
      expect(result[0].deletedAt).toBeNull();
    });

    it('converts types correctly', () => {
      const rows = [
        {
          id: 123, // number
          user_id: 456, // number
          name: null,
          cadence: null,
          color: null,
          sort_order: '10', // string
          is_archived: 1, // truthy number
          version: '5', // string
        },
      ];

      const result = mapRemotePrimaryEntities(rows);

      expect(result[0]).toMatchObject({
        id: '123',
        userId: '456',
        name: '',
        cadence: 'daily',
        color: '#ffffff',
        sortOrder: 10,
        isArchived: true,
        version: 5,
      });
    });
  });

  describe('mapRemoteEntryEntities', () => {
    const FOREIGN_KEY = DOMAIN.entities.entries.row_id;

    it('returns empty array when rows is undefined', () => {
      expect(mapRemoteEntryEntities(undefined)).toEqual([]);
    });

    it('returns empty array when rows is empty', () => {
      expect(mapRemoteEntryEntities([])).toEqual([]);
    });

    it('filters out rows without id', () => {
      const rows = [
        { user_id: 'user-1', [FOREIGN_KEY]: 'entity-1' },
        { id: 'id-1', user_id: 'user-1', [FOREIGN_KEY]: 'entity-1' },
      ];
      const result = mapRemoteEntryEntities(rows);
      expect(result).toHaveLength(1);
    });

    it('filters out rows without user_id', () => {
      const rows = [
        { id: 'id-1', [FOREIGN_KEY]: 'entity-1' },
        { id: 'id-2', user_id: 'user-1', [FOREIGN_KEY]: 'entity-1' },
      ];
      const result = mapRemoteEntryEntities(rows);
      expect(result).toHaveLength(1);
    });

    it(`filters out rows without ${FOREIGN_KEY}`, () => {
      const rows = [
        { id: 'id-1', user_id: 'user-1' },
        { id: 'id-2', user_id: 'user-1', [FOREIGN_KEY]: 'entity-1' },
      ];
      const result = mapRemoteEntryEntities(rows);
      expect(result).toHaveLength(1);
    });

    it('maps valid remote row to domain object', () => {
      const rows = [
        {
          id: 'entry-1',
          user_id: 'user-1',
          [FOREIGN_KEY]: 'entity-1',
          date: '2024-01-15',
          amount: 2,
          source: 'manual',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T11:00:00Z',
          version: 2,
          deleted_at: null,
        },
      ];

      const result = mapRemoteEntryEntities(rows);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'entry-1',
        userId: 'user-1',
        [DOMAIN.entities.entries.foreignKey]: 'entity-1',
        date: '2024-01-15',
        amount: 2,
        source: 'manual',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T11:00:00Z',
        version: 2,
        deletedAt: null,
      });
    });

    it('uses default values for missing optional fields', () => {
      const rows = [
        {
          id: 'entry-1',
          user_id: 'user-1',
          [FOREIGN_KEY]: 'entity-1',
        },
      ];

      const result = mapRemoteEntryEntities(rows);

      expect(result[0]).toMatchObject({
        amount: 0,
        source: 'remote',
        version: 1,
        deletedAt: null,
      });
      expect(result[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('converts types correctly', () => {
      const rows = [
        {
          id: 789,
          user_id: 'user-1',
          [FOREIGN_KEY]: 'entity-1',
          amount: '3.5',
          version: '7',
        },
      ];

      const result = mapRemoteEntryEntities(rows);

      expect(result[0]).toMatchObject({
        id: '789',
        amount: 3.5,
        version: 7,
      });
    });
  });

  describe('mapRemoteReminderEntities', () => {
    const FOREIGN_KEY = toSnakeCase(DOMAIN.entities.reminders.foreignKey);

    it('returns empty array when rows is undefined', () => {
      expect(mapRemoteReminderEntities(undefined)).toEqual([]);
    });

    it('returns empty array when rows is empty', () => {
      expect(mapRemoteReminderEntities([])).toEqual([]);
    });

    it('filters out rows without id', () => {
      const rows = [
        { user_id: 'user-1', [FOREIGN_KEY]: 'entity-1' },
        { id: 'id-1', user_id: 'user-1', [FOREIGN_KEY]: 'entity-1' },
      ];
      const result = mapRemoteReminderEntities(rows);
      expect(result).toHaveLength(1);
    });

    it('filters out rows without user_id', () => {
      const rows = [
        { id: 'id-1', [FOREIGN_KEY]: 'entity-1' },
        { id: 'id-2', user_id: 'user-1', [FOREIGN_KEY]: 'entity-1' },
      ];
      const result = mapRemoteReminderEntities(rows);
      expect(result).toHaveLength(1);
    });

    it(`filters out rows without ${FOREIGN_KEY}`, () => {
      const rows = [
        { id: 'id-1', user_id: 'user-1' },
        { id: 'id-2', user_id: 'user-1', [FOREIGN_KEY]: 'entity-1' },
      ];
      const result = mapRemoteReminderEntities(rows);
      expect(result).toHaveLength(1);
    });

    it('maps valid remote row to domain object', () => {
      const rows = [
        {
          id: 'reminder-1',
          user_id: 'user-1',
          [FOREIGN_KEY]: 'entity-1',
          time_local: '14:30',
          days_of_week: '1,2,3,4,5',
          timezone: 'America/New_York',
          is_enabled: false,
          created_at: '2024-01-20T00:00:00Z',
          updated_at: '2024-01-21T00:00:00Z',
          version: 4,
          deleted_at: '2024-01-22T00:00:00Z',
        },
      ];

      const result = mapRemoteReminderEntities(rows);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'reminder-1',
        userId: 'user-1',
        [DOMAIN.entities.reminders.foreignKey]: 'entity-1',
        timeLocal: '14:30',
        daysOfWeek: '1,2,3,4,5',
        timezone: 'America/New_York',
        isEnabled: false,
        createdAt: '2024-01-20T00:00:00Z',
        updatedAt: '2024-01-21T00:00:00Z',
        version: 4,
        deletedAt: '2024-01-22T00:00:00Z',
      });
    });

    it('uses default values for missing optional fields', () => {
      const rows = [
        {
          id: 'reminder-1',
          user_id: 'user-1',
          [FOREIGN_KEY]: 'entity-1',
        },
      ];

      const result = mapRemoteReminderEntities(rows);

      expect(result[0]).toMatchObject({
        timeLocal: '09:00',
        daysOfWeek: '',
        timezone: 'UTC',
        isEnabled: true,
        version: 1,
        deletedAt: null,
      });
    });

    it('converts types correctly', () => {
      const rows = [
        {
          id: 999,
          user_id: 'user-1',
          [FOREIGN_KEY]: 'entity-1',
          is_enabled: 0, // falsy number
          version: '12',
        },
      ];

      const result = mapRemoteReminderEntities(rows);

      expect(result[0]).toMatchObject({
        id: '999',
        isEnabled: false,
        version: 12,
      });
    });
  });

  describe('mapRemoteDeviceEntities', () => {
    it('returns empty array when rows is undefined', () => {
      expect(mapRemoteDeviceEntities(undefined)).toEqual([]);
    });

    it('returns empty array when rows is empty', () => {
      expect(mapRemoteDeviceEntities([])).toEqual([]);
    });

    it('filters out rows without id', () => {
      const rows = [
        { user_id: 'user-1', platform: 'ios' },
        { id: 'id-1', user_id: 'user-1', platform: 'ios' },
      ];
      const result = mapRemoteDeviceEntities(rows);
      expect(result).toHaveLength(1);
    });

    it('filters out rows without user_id', () => {
      const rows = [
        { id: 'id-1', platform: 'ios' },
        { id: 'id-2', user_id: 'user-1', platform: 'ios' },
      ];
      const result = mapRemoteDeviceEntities(rows);
      expect(result).toHaveLength(1);
    });

    it('maps valid remote row to domain object', () => {
      const rows = [
        {
          id: 'device-1',
          user_id: 'user-1',
          platform: 'android',
          last_sync_at: '2024-01-25T15:30:00Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-25T15:30:00Z',
          version: 8,
          deleted_at: null,
        },
      ];

      const result = mapRemoteDeviceEntities(rows);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'device-1',
        userId: 'user-1',
        platform: 'android',
        lastSyncAt: '2024-01-25T15:30:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-25T15:30:00Z',
        version: 8,
        deletedAt: null,
      });
    });

    it('uses default values for missing optional fields', () => {
      const rows = [
        {
          id: 'device-1',
          user_id: 'user-1',
        },
      ];

      const result = mapRemoteDeviceEntities(rows);

      expect(result[0]).toMatchObject({
        platform: 'unknown',
        lastSyncAt: null,
        version: 1,
        deletedAt: null,
      });
    });

    it('handles null lastSyncAt', () => {
      const rows = [
        {
          id: 'device-1',
          user_id: 'user-1',
          last_sync_at: null,
        },
      ];

      const result = mapRemoteDeviceEntities(rows);
      expect(result[0].lastSyncAt).toBeNull();
    });

    it('converts types correctly', () => {
      const rows = [
        {
          id: 555,
          user_id: 'user-1',
          platform: 123, // non-string
          version: '20',
        },
      ];

      const result = mapRemoteDeviceEntities(rows);

      expect(result[0]).toMatchObject({
        id: '555',
        platform: '123',
        version: 20,
      });
    });
  });
});
