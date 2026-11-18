import {
  COLUMN_MAPPINGS,
  LOCAL_TO_REMOTE_TABLE,
  MERGE_UNIQUE_CONSTRAINTS,
  toRemoteTable,
} from '@/supabase/domain';
import { mapPayloadToRemote, normalizePayload } from '@/supabase/mappers';
import { DOMAIN } from '@/config/domain.config';

describe('supabase domain helpers', () => {
  it('maps local tables to remote names using DOMAIN config', () => {
    expect(LOCAL_TO_REMOTE_TABLE[DOMAIN.entities.primary.tableName]).toBe(
      DOMAIN.entities.primary.remoteTableName,
    );
    expect(LOCAL_TO_REMOTE_TABLE[DOMAIN.entities.entries.tableName]).toBe(
      DOMAIN.entities.entries.remoteTableName,
    );
  });

  it('converts local columns to snake_case remote columns', () => {
    const mapping = COLUMN_MAPPINGS[DOMAIN.entities.entries.tableName];
    const expectedForeignKey = DOMAIN.entities.entries.row_id;
    expect(mapping[DOMAIN.entities.entries.foreignKey]).toBe(expectedForeignKey);
    expect(mapping.updatedAt).toBe('updated_at');
  });

  it('returns remote table name via helper', () => {
    const remote = toRemoteTable(DOMAIN.entities.reminders.tableName);
    expect(remote).toBe(DOMAIN.entities.reminders.remoteTableName);
  });

  it('exposes merge constraint metadata for entries', () => {
    const merge = MERGE_UNIQUE_CONSTRAINTS[DOMAIN.entities.entries.tableName];
    const expectedForeignKey = DOMAIN.entities.entries.row_id;
    expect(merge?.columns).toEqual([expectedForeignKey, 'date']);
    expect(merge?.condition).toContain('deleted_at');
  });

  it('maps payload keys and applies overrides when constructing remote rows', () => {
    const foreignKeyColumn = DOMAIN.entities.entries.row_id;
    const payload = {
      userId: 'user-1',
      [DOMAIN.entities.entries.foreignKey]: 'primary-entity-1',
      date: '2025-01-01',
      amount: 2,
      updatedAt: '2025-01-02T00:00:00.000Z',
    };

    const mapped = mapPayloadToRemote(DOMAIN.entities.entries.tableName, payload, {
      custom: 'value',
    });

    expect(mapped).toMatchObject({
      user_id: 'user-1',
      [foreignKeyColumn]: 'primary-entity-1',
      date: '2025-01-01',
      amount: 2,
      updated_at: '2025-01-02T00:00:00.000Z',
      custom: 'value',
    });
  });

  it('normalizes undefined values to null', () => {
    const normalized = normalizePayload({
      id: 'row-1',
      optional: undefined,
      explicit: null,
    });

    expect(normalized).toEqual({
      id: 'row-1',
      optional: null,
      explicit: null,
    });
  });

  it('skips undefined values in mapPayloadToRemote', () => {
    const payload = {
      userId: 'user-1',
      date: '2025-01-01',
      amount: undefined,
      source: 'app',
    };

    const mapped = mapPayloadToRemote(DOMAIN.entities.entries.tableName, payload);

    expect(mapped).toMatchObject({
      user_id: 'user-1',
      date: '2025-01-01',
      source: 'app',
    });
    expect(mapped.amount).toBeUndefined();
  });

  it('preserves unmapped keys when no mapping exists', () => {
    const payload = {
      userId: 'user-1',
      customField: 'value',
      anotherField: 123,
    };

    const mapped = mapPayloadToRemote(DOMAIN.entities.entries.tableName, payload);

    expect(mapped).toMatchObject({
      user_id: 'user-1',
      customField: 'value',
      anotherField: 123,
    });
  });

  it('handles table with no column mappings gracefully', () => {
    const payload = {
      id: 'test-1',
      field: 'value',
      custom: 123,
    };

    // Test the fallback path when table doesn't exist in COLUMN_MAPPINGS
    // This bypasses TypeScript to test runtime behavior
    const mapped = mapPayloadToRemote('unknown_table' as any, payload);

    // Should preserve all keys as-is when no mapping exists
    expect(mapped).toEqual({
      id: 'test-1',
      field: 'value',
      custom: 123,
    });
  });

  it('applies overrides even for undefined payload values', () => {
    const payload = {
      userId: 'user-1',
      amount: undefined,
    };

    const mapped = mapPayloadToRemote(DOMAIN.entities.entries.tableName, payload, { amount: 5 });

    expect(mapped.amount).toBe(5);
    expect(mapped.user_id).toBe('user-1');
  });

  it('normalizePayload preserves non-undefined values', () => {
    const normalized = normalizePayload({
      string: 'test',
      number: 42,
      boolean: false,
      nullValue: null,
      zero: 0,
      emptyString: '',
    });

    expect(normalized).toEqual({
      string: 'test',
      number: 42,
      boolean: false,
      nullValue: null,
      zero: 0,
      emptyString: '',
    });
  });
});
