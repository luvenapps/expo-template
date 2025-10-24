jest.mock('@/sync/outbox', () => ({
  getPending: jest.fn(),
  markProcessed: jest.fn(),
  incrementAttempt: jest.fn(),
}));

import { beforeEach, describe, expect, test, jest } from '@jest/globals';
import { createSyncEngine } from '@/sync/engine';
import { getPending, markProcessed, incrementAttempt, type OutboxRecord } from '@/sync/outbox';
import { resetSyncStore, useSyncStore } from '@/state/syncStore';

const mockedGetPending = getPending as jest.MockedFunction<typeof getPending>;
const mockedMarkProcessed = markProcessed as jest.MockedFunction<typeof markProcessed>;
const mockedIncrementAttempt = incrementAttempt as jest.MockedFunction<typeof incrementAttempt>;

const records = [
  {
    id: '1',
    tableName: 'test',
    rowId: '1',
    operation: 'insert',
    payloadJson: '{}',
    version: 1,
    attempts: 0,
    createdAt: 'now',
  },
];

describe('createSyncEngine', () => {
  beforeEach(() => {
    resetSyncStore();
    jest.clearAllMocks();
  });

  test('processOutbox pushes and marks processed', async () => {
    mockedGetPending.mockResolvedValue(records as any);
    const push = jest.fn<(records: OutboxRecord[]) => Promise<void>>().mockResolvedValue(undefined);

    const engine = createSyncEngine({ push });
    await engine.processOutbox();

    expect(push).toHaveBeenCalledWith(records);
    expect(mockedMarkProcessed).toHaveBeenCalledWith(['1']);
    expect(useSyncStore.getState().status).toBe('idle');
    expect(useSyncStore.getState().queueSize).toBe(1);
  });

  test('processOutbox increments attempts on failure with Error', async () => {
    mockedGetPending.mockResolvedValue(records as any);
    const push = jest
      .fn<(records: OutboxRecord[]) => Promise<void>>()
      .mockRejectedValue(new Error('fail'));

    const engine = createSyncEngine({ push });

    await expect(engine.processOutbox()).rejects.toThrow('fail');
    expect(mockedIncrementAttempt).toHaveBeenCalledWith('1');
    expect(useSyncStore.getState().status).toBe('error');
    expect(useSyncStore.getState().lastError).toBe('fail');
  });

  test('processOutbox increments attempts on failure with non-Error', async () => {
    mockedGetPending.mockResolvedValue(records as any);
    const push = jest
      .fn<(records: OutboxRecord[]) => Promise<void>>()
      .mockRejectedValue('string error');

    const engine = createSyncEngine({ push });

    await expect(engine.processOutbox()).rejects.toBe('string error');
    expect(mockedIncrementAttempt).toHaveBeenCalledWith('1');
    expect(useSyncStore.getState().status).toBe('error');
    expect(useSyncStore.getState().lastError).toBe('string error');
  });

  test('runSync processes outbox and pull when pull is provided', async () => {
    mockedGetPending.mockResolvedValue([]);
    const push = jest.fn<(records: OutboxRecord[]) => Promise<void>>().mockResolvedValue(undefined);
    const pull = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);

    const engine = createSyncEngine({ push, pull });
    await engine.runSync();

    expect(push).not.toHaveBeenCalled();
    expect(pull).toHaveBeenCalled();
    expect(useSyncStore.getState().lastSyncedAt).not.toBeNull();
  });

  test('runSync processes outbox without pull when pull is not provided', async () => {
    mockedGetPending.mockResolvedValue([]);
    const push = jest.fn<(records: OutboxRecord[]) => Promise<void>>().mockResolvedValue(undefined);

    const engine = createSyncEngine({ push });
    await engine.runSync();

    expect(push).not.toHaveBeenCalled();
    expect(useSyncStore.getState().status).toBe('idle');
  });
});
