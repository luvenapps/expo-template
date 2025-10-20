jest.mock('drizzle-orm', () => ({
  eq: (_column: unknown, value: string) => ({ value }),
}));

import { createRepository } from '@/db/sqlite/repository';
import { beforeEach, describe, expect, test } from '@jest/globals';

const table = {
  id: { name: 'id' },
  createdAt: { name: 'created_at' },
  updatedAt: { name: 'updated_at' },
  deletedAt: { name: 'deleted_at' },
  _: {
    columns: {
      id: { _: { notNull: true, data: '' } },
      createdAt: { _: { notNull: true, data: '' } },
      updatedAt: { _: { notNull: true, data: '' } },
      deletedAt: { _: { notNull: false, data: '' } },
    },
    inferInsert: {} as { id: string; createdAt?: string; updatedAt?: string; deletedAt?: string },
    inferSelect: {} as { id: string; createdAt: string; updatedAt: string; deletedAt?: string },
  },
  $inferInsert: {} as { id: string; createdAt?: string; updatedAt?: string; deletedAt?: string },
  $inferSelect: {} as { id: string; createdAt: string; updatedAt: string; deletedAt?: string },
} as any;

type Repository = ReturnType<typeof createRepository<typeof table, 'id'>>;

type DbMocks = {
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  select: jest.Mock;
};

const createDbMocks = () => {
  const insertValues = jest.fn();
  const insertOnConflict = jest.fn();
  const insert = jest.fn(() => ({
    values: jest.fn((payload) => {
      insertValues(payload);
      return {
        onConflictDoUpdate: jest.fn((config) => {
          insertOnConflict(config.set);
        }),
      };
    }),
  }));

  const updateWhere = jest.fn();
  const updateSet = jest.fn((payload) => ({
    where: jest.fn((clause) => updateWhere(clause, payload)),
  }));
  const update = jest.fn(() => ({ set: updateSet }));

  const deleteWhere = jest.fn();
  const del = jest.fn(() => ({ where: deleteWhere }));

  const selectWhere = jest.fn();
  const selectFrom = jest.fn(() => ({ where: selectWhere }));
  const select = jest.fn(() => ({ from: selectFrom }));

  return {
    insert,
    insertValues,
    insertOnConflict,
    update,
    updateSet,
    updateWhere,
    delete: del,
    deleteWhere,
    select,
    selectFrom,
    selectWhere,
  } as DbMocks & {
    insertValues: jest.Mock;
    insertOnConflict: jest.Mock;
    updateSet: jest.Mock;
    updateWhere: jest.Mock;
    deleteWhere: jest.Mock;
    selectWhere: jest.Mock;
    selectFrom: jest.Mock;
  };
};

describe('createRepository', () => {
  let dbMocks: ReturnType<typeof createDbMocks>;
  let repository: Repository;

  beforeEach(() => {
    dbMocks = createDbMocks();
    repository = createRepository({
      db: dbMocks as any,
      table: table as any,
      primaryKey: 'id',
      createdAtColumn: 'createdAt',
      updatedAtColumn: 'updatedAt',
      deletedAtColumn: 'deletedAt',
    });
  });

  test('insert sets timestamps', async () => {
    await repository.insert({ id: '1', value: 'alpha' } as any);

    expect(dbMocks.insert).toHaveBeenCalledWith(table);
    expect(dbMocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      }),
    );
  });

  test('insert preserves existing createdAt when provided', async () => {
    const existingCreatedAt = '2024-01-01T00:00:00.000Z';
    await repository.insert({ id: '1', value: 'alpha', createdAt: existingCreatedAt } as any);

    expect(dbMocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        createdAt: existingCreatedAt,
        updatedAt: expect.any(String),
      }),
    );
  });

  test('upsert updates existing record via onConflict', async () => {
    await repository.upsert({ id: '1', value: 'alpha' } as any);

    expect(dbMocks.insertOnConflict).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '1',
        value: 'alpha',
      }),
    );
  });

  test('update applies timestamps and where clause', async () => {
    await repository.update('1', { value: 'beta' } as any);

    expect(dbMocks.update).toHaveBeenCalledWith(table);
    expect(dbMocks.updateWhere).toHaveBeenCalledWith(
      expect.objectContaining({ value: '1' }),
      expect.objectContaining({ value: 'beta', updatedAt: expect.any(String) }),
    );
  });

  test('remove soft deletes when deletedAtColumn provided', async () => {
    await repository.remove('1');

    expect(dbMocks.update).toHaveBeenCalled();
    expect(dbMocks.updateWhere).toHaveBeenCalledWith(
      expect.objectContaining({ value: '1' }),
      expect.objectContaining({ deletedAt: expect.any(String) }),
    );
  });

  test('remove hard deletes when no deletedAtColumn', async () => {
    const deleteDb = createDbMocks();
    const hardDeleteRepo = createRepository({
      db: deleteDb as any,
      table: table as any,
      primaryKey: 'id',
      createdAtColumn: 'createdAt',
      updatedAtColumn: 'updatedAt',
    });

    await hardDeleteRepo.remove('1');

    expect(deleteDb.delete).toHaveBeenCalledWith(table);
    expect(deleteDb.deleteWhere).toHaveBeenCalledWith(expect.objectContaining({ value: '1' }));
  });

  test('findById returns first record or null', async () => {
    dbMocks.selectWhere.mockResolvedValueOnce([{ id: '1', value: 'alpha' }]);
    const found = await repository.findById('1');
    expect(found).toEqual({ id: '1', value: 'alpha' });

    dbMocks.selectWhere.mockResolvedValueOnce([]);
    const missing = await repository.findById('2');
    expect(missing).toBeNull();
  });

  test('all delegates to select().from()', async () => {
    const rows = [{ id: '1' }];
    dbMocks.select.mockReturnValueOnce({ from: jest.fn(() => rows) } as any);

    const result = await repository.all();
    expect(result).toEqual(rows);
  });

  test('repository without updatedAtColumn skips updating it', async () => {
    const noUpdateDb = createDbMocks();
    const noUpdateRepo = createRepository({
      db: noUpdateDb as any,
      table: table as any,
      primaryKey: 'id',
      createdAtColumn: 'createdAt',
    });

    await noUpdateRepo.insert({ id: '1', value: 'test' } as any);

    expect(noUpdateDb.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        createdAt: expect.any(String),
      }),
    );
    expect(noUpdateDb.insertValues).toHaveBeenCalledWith(
      expect.not.objectContaining({
        updatedAt: expect.anything(),
      }),
    );
  });
});
