import { DOMAIN as mockDomain } from '@/config/domain.config';

const insertCalls: { table: { name: string }; row: unknown }[] = [];
const conflictCalls: { target: unknown; set: unknown }[] = [];

const dbMock = {
  insert: jest.fn((table: { name: string }) => ({
    values: (row: unknown) => {
      insertCalls.push({ table, row });
      return {
        onConflictDoUpdate: ({ target, set }: { target: unknown; set: unknown }) => {
          conflictCalls.push({ target, set });
        },
      };
    },
  })),
};

const mockGetDb = jest.fn(() => Promise.resolve(dbMock));

jest.mock('@/db/sqlite', () => {
  const createTable = (name: string) => ({ name, id: `${name}-id` });
  return {
    __esModule: true,
    primaryEntity: createTable(`${mockDomain.entities.primary.plural}`),
    entryEntity: createTable(`${mockDomain.entities.primary.name}_entries`),
    reminderEntity: createTable('reminders'),
    deviceEntity: createTable('devices'),
    getDb: mockGetDb,
  };
});

type LocalPersistenceModule = typeof import('@/sync/localPersistence');

const { upsertRecords, registerPersistenceTable, resetPersistenceRegistry } =
  require('@/sync/localPersistence') as LocalPersistenceModule;
const { primaryEntity, entryEntity } = require('@/db/sqlite');

describe('localPersistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    insertCalls.length = 0;
    conflictCalls.length = 0;
    resetPersistenceRegistry();
    registerPersistenceTable(mockDomain.entities.primary.tableName, {
      table: primaryEntity,
      primaryKey: primaryEntity.id,
    });
    registerPersistenceTable(mockDomain.entities.entries.tableName, {
      table: entryEntity,
      primaryKey: entryEntity.id,
    });
  });

  describe('upsertRecords', () => {
    it('skips database work when no rows provided', async () => {
      await upsertRecords(mockDomain.entities.primary.tableName, []);

      expect(mockGetDb).not.toHaveBeenCalled();
      expect(dbMock.insert).not.toHaveBeenCalled();
    });

    it(`upserts each ${mockDomain.entities.primary.name} row using the table primary key as conflict target`, async () => {
      const rows = [
        {
          id: `${mockDomain.entities.primary.name}-1`,
          userId: 'user-1',
          name: 'Drink water',
          cadence: 'daily',
          color: '#ffffff',
          sortOrder: 1,
          isArchived: false,
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
          version: 1,
          deletedAt: null,
        },
        {
          id: `${mockDomain.entities.primary.name}-2`,
          userId: 'user-1',
          name: 'Stretch',
          cadence: 'daily',
          color: '#000000',
          sortOrder: 2,
          isArchived: false,
          createdAt: '2025-01-02T00:00:00.000Z',
          updatedAt: '2025-01-02T00:00:00.000Z',
          version: 1,
          deletedAt: null,
        },
      ];

      await upsertRecords(mockDomain.entities.primary.tableName, rows);

      expect(mockGetDb).toHaveBeenCalledTimes(1);
      expect(dbMock.insert).toHaveBeenCalledTimes(rows.length);

      expect(insertCalls).toHaveLength(rows.length);
      insertCalls.forEach((call, index) => {
        expect(call.table.name).toBe(mockDomain.entities.primary.tableName);
        expect(call.row).toEqual(rows[index]);
      });

      expect(conflictCalls).toHaveLength(rows.length);
      conflictCalls.forEach((call, index) => {
        expect(call.target).toBe(`${mockDomain.entities.primary.tableName}-id`);
        expect(call.set).toEqual(rows[index]);
      });
    });

    it('supports other tables such as entries', async () => {
      const entryRows = [
        {
          id: 'entry-1',
          userId: 'user-1',
          [mockDomain.entities.entries.foreignKey]: `${mockDomain.entities.primary.name}-1`,
          date: '2025-01-01',
          amount: 1,
          source: 'local',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
          version: 1,
          deletedAt: null,
        },
      ];

      await upsertRecords(mockDomain.entities.entries.tableName, entryRows);

      expect(mockGetDb).toHaveBeenCalledTimes(1);
      expect(dbMock.insert).toHaveBeenCalledTimes(entryRows.length);
      expect(insertCalls[0]?.table.name).toBe(mockDomain.entities.entries.tableName);
      expect(insertCalls[0]?.row).toEqual(entryRows[0]);
      expect(conflictCalls[0]?.target).toBe(`${mockDomain.entities.entries.tableName}-id`);
      expect(conflictCalls[0]?.set).toEqual(entryRows[0]);
    });

    it('throws error for unregistered table', async () => {
      const rows = [{ id: 'test-1' }];

      await expect(upsertRecords('unknown_table', rows)).rejects.toThrow(
        'No persistence table registered for "unknown_table".',
      );

      expect(mockGetDb).not.toHaveBeenCalled();
    });
  });
});
