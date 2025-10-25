jest.mock('uuid', () => {
  let counter = 0;
  return {
    v4: jest.fn(() => `mock-uuid-${++counter}`),
  };
});

import { DOMAIN } from '@/config/domain.config';
import { outbox } from '@/db/sqlite';
import {
  clearAll,
  clearTable,
  enqueue,
  getPending,
  incrementAttempt,
  markProcessed,
  resetOutboxDatabase,
  setOutboxDatabase,
} from '@/sync/outbox';
import { describe, expect, test } from '@jest/globals';

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
        payload: JSON.stringify(payload),
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

  test('getPending uses default limit of 100', async () => {
    const records = [{ id: 'mock-uuid-3', rowId: '2' }];
    const chain = createSelectChain(records);

    setOutboxDatabase({
      insert: jest.fn(),
      select: chain.select,
      delete: jest.fn(),
      update: jest.fn(),
    } as any);

    await getPending();
    expect(chain.limit).toHaveBeenCalledWith(100);
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

  test('markProcessed does nothing when id list empty', async () => {
    const deleteFn = jest.fn(() => ({ where: jest.fn() }));

    setOutboxDatabase({
      insert: jest.fn(),
      select: jest.fn(),
      delete: deleteFn,
      update: jest.fn(),
    } as any);

    await markProcessed([]);
    expect(deleteFn).not.toHaveBeenCalled();
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

  test('clearTable deletes by table name', async () => {
    const where = jest.fn();
    const deleteFn = jest.fn(() => ({ where }));

    setOutboxDatabase({
      insert: jest.fn(),
      select: jest.fn(),
      delete: deleteFn,
      update: jest.fn(),
    } as any);

    await clearTable(`${DOMAIN.entities.primary.plural}`);

    expect(deleteFn).toHaveBeenCalledWith(outbox);
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
