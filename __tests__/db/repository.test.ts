import { beforeEach, describe, expect, test } from '@jest/globals';
import { createRepository } from '@/db/sqlite/repository';

jest.mock('drizzle-orm', () => ({
  eq: (_column: unknown, value: string) => ({ value }),
}));

type InsertPayload = {
  id: string;
  value: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
};

type SelectPayload = InsertPayload;

type MockDb = {
  rows: SelectPayload[];
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  select: jest.Mock;
};

function createMockDb(): MockDb {
  const rows: SelectPayload[] = [];

  return {
    rows,
    insert: jest.fn(() => ({
      values: jest.fn((record: InsertPayload) => {
        const existingIndex = rows.findIndex((row) => row.id === record.id);
        if (existingIndex !== -1) {
          rows[existingIndex] = { ...rows[existingIndex], ...record };
        } else {
          rows.push({ ...record });
        }
        return {
          onConflictDoUpdate: jest.fn(({ set }: { set: Partial<SelectPayload> }) => {
            const existing = rows.find((row) => row.id === record.id);
            if (existing) {
              Object.assign(existing, set);
            }
          }),
        };
      }),
    })),
    update: jest.fn(() => ({
      set: jest.fn((payload: Partial<SelectPayload>) => ({
        where: jest.fn((clause: { value: string }) => {
          const existing = rows.find((row) => row.id === clause.value);
          if (existing) {
            Object.assign(existing, payload);
          }
        }),
      })),
    })),
    delete: jest.fn(() => ({
      where: jest.fn((clause: { value: string }) => {
        const index = rows.findIndex((row) => row.id === clause.value);
        if (index !== -1) {
          rows.splice(index, 1);
        }
      }),
    })),
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn((clause: { value: string }) =>
          rows.filter((row) => row.id === clause.value),
        ),
      })),
    })),
  } as unknown as MockDb;
}

describe('createRepository helper', () => {
  const table = {
    id: { name: 'id' },
    createdAt: { name: 'created_at' },
    updatedAt: { name: 'updated_at' },
    deletedAt: { name: 'deleted_at' },
  } as any;

  let mockDb: MockDb;
  let repository: ReturnType<typeof createRepository<typeof table, 'id'>>;

  beforeEach(() => {
    mockDb = createMockDb();
    repository = createRepository({
      db: mockDb as any,
      table,
      primaryKey: 'id',
      createdAtColumn: 'createdAt',
      updatedAtColumn: 'updatedAt',
      deletedAtColumn: 'deletedAt',
    });
  });

  test('insert sets timestamps', async () => {
    await repository.insert({ id: '1', value: 'alpha' });

    expect(mockDb.rows).toHaveLength(1);
    const [record] = mockDb.rows;
    expect(record?.createdAt).toBeDefined();
    expect(record?.updatedAt).toBeDefined();
  });

  test('upsert updates existing record', async () => {
    await repository.insert({ id: '1', value: 'alpha' });
    await repository.upsert({ id: '1', value: 'beta' });

    expect(mockDb.rows[0]?.value).toBe('beta');
  });

  test('remove performs soft delete', async () => {
    await repository.insert({ id: '1', value: 'alpha' });
    await repository.remove('1');

    expect(mockDb.rows[0]?.deletedAt).toBeDefined();
  });
});
