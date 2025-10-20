import { beforeEach, describe, expect, test } from '@jest/globals';
import {
  setOutboxDatabase,
  resetOutboxDatabase,
  enqueue,
  getPending,
  markProcessed,
  incrementAttempt,
  clearAll,
} from '@/sync/outbox';
import { outbox } from '@/db/sqlite';

jest.mock('expo-sqlite/next', () => ({
  openDatabaseSync: jest.fn(() => ({})),
  deleteDatabaseSync: jest.fn(),
}));

jest.mock('uuid', () => {
  let counter = 0;
  return {
    v4: jest.fn(() => `mock-uuid-${++counter}`),
  };
});

function createSelectChain(result: unknown) {
  const limit = jest.fn().mockResolvedValue(result);
  const orderBy = jest.fn(() => ({ limit }));
  const from = jest.fn(() => ({ orderBy }));
  const select = jest.fn(() => ({ from }));
  return { select, from, orderBy, limit };
}

describe('outbox helpers', () => {
  afterEach(() => {
    resetOutboxDatabase();
  });

  test('enqueue stores payload via insert', async () => {
    const values = jest.fn().mockResolvedValue(undefined);
    const insert = jest.fn(() => ({ values }));

    setOutboxDatabase({
      insert,
      select: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    } as any);

    const payload = { message: 'hello' };
    const id = await enqueue({ tableName: 'test', rowId: '1', operation: 'insert', payload });

    expect(id).toBe('mock-uuid-1');
    expect(insert).toHaveBeenCalledWith(outbox);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        payloadJson: JSON.stringify(payload),
        tableName: 'test',
        rowId: '1',
      }),
    );
  });

  test('getPending delegates to select chain', async () => {
    const records = [{ id: 'mock-uuid-2', rowId: '1' }];
    const chain = createSelectChain(records);

    setOutboxDatabase({
      insert: jest.fn(),
      select: chain.select,
      delete: jest.fn(),
      update: jest.fn(),
    } as any);

    const result = await getPending(10);
    expect(chain.select).toHaveBeenCalled();
    expect(chain.from).toHaveBeenCalledWith(outbox);
    expect(chain.orderBy).toHaveBeenCalled();
    expect(chain.limit).toHaveBeenCalledWith(10);
    expect(result).toEqual(records);
  });

  test('markProcessed deletes in batch', async () => {
    const where = jest.fn();
    const deleteFn = jest.fn(() => ({ where }));

    setOutboxDatabase({
      insert: jest.fn(),
      select: jest.fn(),
      delete: deleteFn,
      update: jest.fn(),
    } as any);

    await markProcessed(['mock-uuid-3', 'mock-uuid-4']);

    expect(deleteFn).toHaveBeenCalledWith(outbox);
    expect(where).toHaveBeenCalled();
  });

  test('incrementAttempt updates attempts column', async () => {
    const where = jest.fn();
    const set = jest.fn(() => ({ where }));
    const update = jest.fn(() => ({ set }));

    setOutboxDatabase({
      insert: jest.fn(),
      select: jest.fn(),
      delete: jest.fn(),
      update,
    } as any);

    await incrementAttempt('mock-uuid-5');

    expect(update).toHaveBeenCalledWith(outbox);
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ attempts: expect.any(Object) }));
    expect(where).toHaveBeenCalled();
  });

  test('clearAll issues delete without where', async () => {
    const deleteFn = jest.fn();

    setOutboxDatabase({
      insert: jest.fn(),
      select: jest.fn(),
      delete: deleteFn,
      update: jest.fn(),
    } as any);

    await clearAll();
    expect(deleteFn).toHaveBeenCalledWith(outbox);
  });
});
