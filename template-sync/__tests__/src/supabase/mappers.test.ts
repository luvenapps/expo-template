import { DOMAIN } from '@/config/domain.config';
import { mapPayloadToRemote, normalizePayload } from '@/supabase/mappers';

describe('mappers', () => {
  describe('mapPayloadToRemote', () => {
    it('maps local column names to remote column names for primary entities', () => {
      const payload = {
        userId: 'user-1',
        name: 'Exercise',
        sortOrder: 5,
        isArchived: true,
      };

      const result = mapPayloadToRemote(DOMAIN.entities.primary.tableName, payload);

      expect(result).toEqual({
        user_id: 'user-1',
        name: 'Exercise',
        sort_order: 5,
        is_archived: true,
      });
    });

    it('maps local column names to remote column names for entries', () => {
      const payload = {
        userId: 'user-1',
        [DOMAIN.entities.entries.foreignKey]: 'entity-1',
        date: '2024-01-15',
        amount: 2,
      };

      const result = mapPayloadToRemote(DOMAIN.entities.entries.tableName, payload);

      expect(result).toEqual({
        user_id: 'user-1',
        [DOMAIN.entities.entries.row_id]: 'entity-1',
        date: '2024-01-15',
        amount: 2,
      });
    });

    it('maps local column names to remote column names for reminders', () => {
      const payload = {
        userId: 'user-1',
        [DOMAIN.entities.reminders.foreignKey]: 'entity-1',
        timeLocal: '14:30',
        daysOfWeek: '1,2,3,4,5',
        isEnabled: true,
      };

      const result = mapPayloadToRemote(DOMAIN.entities.reminders.tableName, payload);

      expect(result.user_id).toBe('user-1');
      expect(result.time_local).toBe('14:30');
      expect(result.days_of_week).toBe('1,2,3,4,5');
      expect(result.is_enabled).toBe(true);
    });

    it('maps local column names to remote column names for devices', () => {
      const payload = {
        userId: 'user-1',
        platform: 'ios',
        lastSyncAt: '2024-01-25T15:30:00Z',
      };

      const result = mapPayloadToRemote(DOMAIN.entities.devices.tableName, payload);

      expect(result).toEqual({
        user_id: 'user-1',
        platform: 'ios',
        last_sync_at: '2024-01-25T15:30:00Z',
      });
    });

    it('preserves unmapped columns as-is', () => {
      const payload = {
        id: 'test-id',
        userId: 'user-1',
        customField: 'custom-value',
      };

      const result = mapPayloadToRemote(DOMAIN.entities.primary.tableName, payload);

      expect(result).toEqual({
        id: 'test-id',
        user_id: 'user-1',
        customField: 'custom-value',
      });
    });

    it('skips undefined values', () => {
      const payload = {
        userId: 'user-1',
        name: undefined,
        sortOrder: 5,
      };

      const result = mapPayloadToRemote(DOMAIN.entities.primary.tableName, payload);

      expect(result).toEqual({
        user_id: 'user-1',
        sort_order: 5,
      });
      expect(result).not.toHaveProperty('name');
    });

    it('includes null values', () => {
      const payload = {
        userId: 'user-1',
        name: null,
        sortOrder: 5,
      };

      const result = mapPayloadToRemote(DOMAIN.entities.primary.tableName, payload);

      expect(result).toEqual({
        user_id: 'user-1',
        name: null,
        sort_order: 5,
      });
    });

    it('applies overrides', () => {
      const payload = {
        userId: 'user-1',
        name: 'Exercise',
      };

      const overrides = {
        user_id: 'override-user',
        extra_field: 'extra-value',
      };

      const result = mapPayloadToRemote(DOMAIN.entities.primary.tableName, payload, overrides);

      expect(result).toEqual({
        user_id: 'override-user',
        name: 'Exercise',
        extra_field: 'extra-value',
      });
    });

    it('handles unknown table names gracefully', () => {
      const payload = {
        field1: 'value1',
        field2: 'value2',
      };

      // @ts-expect-error Testing unknown table
      const result = mapPayloadToRemote('unknown_table', payload);

      expect(result).toEqual({
        field1: 'value1',
        field2: 'value2',
      });
    });

    it('handles empty payload', () => {
      const result = mapPayloadToRemote(DOMAIN.entities.primary.tableName, {});
      expect(result).toEqual({});
    });

    it('handles empty overrides', () => {
      const payload = { userId: 'user-1' };
      const result = mapPayloadToRemote(DOMAIN.entities.primary.tableName, payload, {});

      expect(result).toEqual({ user_id: 'user-1' });
    });
  });

  describe('normalizePayload', () => {
    it('converts undefined values to null', () => {
      const payload = {
        field1: 'value1',
        field2: undefined,
        field3: 'value3',
        field4: undefined,
      };

      const result = normalizePayload(payload);

      expect(result).toEqual({
        field1: 'value1',
        field2: null,
        field3: 'value3',
        field4: null,
      });
    });

    it('preserves null values', () => {
      const payload = {
        field1: null,
        field2: 'value2',
      };

      const result = normalizePayload(payload);

      expect(result).toEqual({
        field1: null,
        field2: 'value2',
      });
    });

    it('preserves other falsy values', () => {
      const payload = {
        zero: 0,
        emptyString: '',
        falseBool: false,
      };

      const result = normalizePayload(payload);

      expect(result).toEqual({
        zero: 0,
        emptyString: '',
        falseBool: false,
      });
    });

    it('handles empty object', () => {
      const result = normalizePayload({});
      expect(result).toEqual({});
    });

    it('handles complex nested values', () => {
      const payload = {
        object: { nested: 'value' },
        array: [1, 2, 3],
        date: new Date('2024-01-01'),
        undef: undefined,
      };

      const result = normalizePayload(payload);

      expect(result.object).toEqual({ nested: 'value' });
      expect(result.array).toEqual([1, 2, 3]);
      expect(result.date).toBeInstanceOf(Date);
      expect(result.undef).toBeNull();
    });

    it('does not mutate original payload', () => {
      const original = {
        field1: 'value1',
        field2: undefined,
      };

      const originalCopy = { ...original };
      normalizePayload(original);

      expect(original).toEqual(originalCopy);
    });
  });
});
