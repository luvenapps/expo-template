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

  describe('error handling', () => {
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    test('insert handles errors', async () => {
      const errorDb = createDbMocks();
      const error = new Error('Database insert failed');
      errorDb.insert.mockImplementationOnce(() => ({
        values: jest.fn(() => {
          throw error;
        }),
      }));

      const errorRepo = createRepository({
        db: errorDb as any,
        table: table as any,
        primaryKey: 'id',
      });

      await expect(errorRepo.insert({ id: '1' } as any)).rejects.toThrow('Database insert failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Repository] Insert failed:'),
        error,
      );
    });

    test('insert surfaces friendly unique constraint message', async () => {
      const errorDb = createDbMocks();
      const error = new Error('UNIQUE constraint failed: items.id');
      errorDb.insert.mockImplementationOnce(() => ({
        values: jest.fn(() => {
          throw error;
        }),
      }));

      const errorRepo = createRepository({
        db: errorDb as any,
        table: table as any,
        primaryKey: 'id',
      });

      await expect(errorRepo.insert({ id: '1' } as any)).rejects.toThrow(
        'A record with these values already exists (items.id).',
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Repository] Insert failed:'),
        error,
      );
    });

    test('insert surfaces friendly not-null message', async () => {
      const errorDb = createDbMocks();
      const error = new Error('NOT NULL constraint failed: items.name');
      errorDb.insert.mockImplementationOnce(() => ({
        values: jest.fn(() => {
          throw error;
        }),
      }));

      const errorRepo = createRepository({
        db: errorDb as any,
        table: table as any,
        primaryKey: 'id',
      });

      await expect(errorRepo.insert({ id: '1' } as any)).rejects.toThrow(
        'Required field "name" is missing.',
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Repository] Insert failed:'),
        error,
      );
    });

    test('insert surfaces friendly foreign key message', async () => {
      const errorDb = createDbMocks();
      const error = new Error('FOREIGN KEY constraint failed');
      errorDb.insert.mockImplementationOnce(() => ({
        values: jest.fn(() => {
          throw error;
        }),
      }));

      const errorRepo = createRepository({
        db: errorDb as any,
        table: table as any,
        primaryKey: 'id',
      });

      await expect(errorRepo.insert({ id: '1' } as any)).rejects.toThrow(
        'Related data is missing. Make sure the associated record exists.',
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Repository] Insert failed:'),
        error,
      );
    });

    test('insert surfaces friendly generic constraint message', async () => {
      const errorDb = createDbMocks();
      const error = new Error('constraint failed');
      errorDb.insert.mockImplementationOnce(() => ({
        values: jest.fn(() => {
          throw error;
        }),
      }));

      const errorRepo = createRepository({
        db: errorDb as any,
        table: table as any,
        primaryKey: 'id',
      });

      await expect(errorRepo.insert({ id: '1' } as any)).rejects.toThrow(
        'Database constraint failed. Please verify your input values.',
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Repository] Insert failed:'),
        error,
      );
    });

    test('upsert handles errors', async () => {
      const errorDb = createDbMocks();
      const error = new Error('Database upsert failed');
      errorDb.insert.mockImplementationOnce(() => ({
        values: jest.fn(() => {
          throw error;
        }),
      }));

      const errorRepo = createRepository({
        db: errorDb as any,
        table: table as any,
        primaryKey: 'id',
      });

      await expect(errorRepo.upsert({ id: '1' } as any)).rejects.toThrow('Database upsert failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Repository] Upsert failed:'),
        error,
      );
    });

    test('update handles errors', async () => {
      const errorDb = createDbMocks();
      const error = new Error('Database update failed');
      errorDb.update.mockImplementationOnce(() => ({
        set: jest.fn(() => {
          throw error;
        }),
      }));

      const errorRepo = createRepository({
        db: errorDb as any,
        table: table as any,
        primaryKey: 'id',
      });

      await expect(errorRepo.update('1', { value: 'test' } as any)).rejects.toThrow(
        'Database update failed',
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Repository] Update failed:'),
        error,
      );
    });

    test('findById handles errors', async () => {
      const errorDb = createDbMocks();
      const error = new Error('Database findById failed');
      errorDb.select.mockImplementationOnce(() => ({
        from: jest.fn(() => {
          throw error;
        }),
      }));

      const errorRepo = createRepository({
        db: errorDb as any,
        table: table as any,
        primaryKey: 'id',
      });

      await expect(errorRepo.findById('1')).rejects.toThrow('Database findById failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Repository] FindById failed:'),
        error,
      );
    });

    test('all handles errors', async () => {
      const errorDb = createDbMocks();
      const error = new Error('Database all failed');
      errorDb.select.mockImplementationOnce(() => ({
        from: jest.fn(() => {
          throw error;
        }),
      }));

      const errorRepo = createRepository({
        db: errorDb as any,
        table: table as any,
        primaryKey: 'id',
      });

      await expect(errorRepo.all()).rejects.toThrow('Database all failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Repository] All failed:'),
        error,
      );
    });

    test('remove handles errors with soft delete', async () => {
      const errorDb = createDbMocks();
      const error = new Error('Database remove failed');
      errorDb.update.mockImplementationOnce(() => ({
        set: jest.fn(() => {
          throw error;
        }),
      }));

      const errorRepo = createRepository({
        db: errorDb as any,
        table: table as any,
        primaryKey: 'id',
        deletedAtColumn: 'deletedAt',
      });

      await expect(errorRepo.remove('1')).rejects.toThrow('Database remove failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Repository] Remove failed:'),
        error,
      );
    });

    test('remove handles errors with hard delete', async () => {
      const errorDb = createDbMocks();
      const error = new Error('Database delete failed');
      errorDb.delete.mockImplementationOnce(() => ({
        where: jest.fn(() => {
          throw error;
        }),
      }));

      const errorRepo = createRepository({
        db: errorDb as any,
        table: table as any,
        primaryKey: 'id',
      });

      await expect(errorRepo.remove('1')).rejects.toThrow('Database delete failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Repository] Remove failed:'),
        error,
      );
    });
  });
});
