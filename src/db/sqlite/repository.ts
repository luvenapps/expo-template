import { eq } from 'drizzle-orm';
import type { AnySQLiteTable } from 'drizzle-orm/sqlite-core';
import { db } from './client';

const now = () => new Date().toISOString();

export type Database = typeof db;

export type RepositoryOptions<
  TTable extends AnySQLiteTable,
  TPrimaryKey extends keyof TTable['_']['columns'],
> = {
  db: Database;
  table: TTable;
  primaryKey: TPrimaryKey;
  createdAtColumn?: keyof TTable['_']['columns'];
  updatedAtColumn?: keyof TTable['_']['columns'];
  deletedAtColumn?: keyof TTable['_']['columns'];
};

export function createRepository<
  TTable extends AnySQLiteTable,
  TPrimaryKey extends keyof TTable['_']['columns'],
>({
  db: database,
  table,
  primaryKey,
  createdAtColumn,
  updatedAtColumn,
  deletedAtColumn,
}: RepositoryOptions<TTable, TPrimaryKey>) {
  type Insert = TTable['_']['inferInsert'];
  type Select = TTable['_']['inferSelect'];

  const pkColumn = table[primaryKey as keyof typeof table] as any;

  const applyTimestamps = (payload: Insert | Partial<Select>) => {
    const next = { ...payload } as Record<string, unknown>;

    if (createdAtColumn && next[createdAtColumn as string] === undefined) {
      next[createdAtColumn as string] = now();
    }

    if (updatedAtColumn) {
      next[updatedAtColumn as string] = now();
    }

    return next as Insert & Partial<Select>;
  };

  const createSoftDeletePayload = deletedAtColumn
    ? (payload: Partial<Select> = {}) => ({
        ...(payload as Record<string, unknown>),
        [deletedAtColumn as string]: now(),
      })
    : undefined;

  type PrimaryKeyValue = Select[TPrimaryKey];

  return {
    async insert(values: Insert) {
      const data = applyTimestamps(values);
      await database.insert(table).values(data as Insert);
    },
    async upsert(values: Insert) {
      const data = applyTimestamps(values);
      await database
        .insert(table)
        .values(data as Insert)
        .onConflictDoUpdate({
          target: pkColumn,
          set: data as Partial<Select>,
        });
    },
    async update(id: PrimaryKeyValue, values: Partial<Select>) {
      const data = applyTimestamps(values);
      await database
        .update(table)
        .set(data as Partial<Select>)
        .where(eq(pkColumn, id as any));
    },
    async findById(id: PrimaryKeyValue) {
      const [record] = await database
        .select()
        .from(table)
        .where(eq(pkColumn, id as any));
      return record ?? null;
    },
    async all() {
      return database.select().from(table);
    },
    async remove(id: PrimaryKeyValue) {
      if (createSoftDeletePayload) {
        await database
          .update(table)
          .set(createSoftDeletePayload() as any)
          .where(eq(pkColumn, id as any));
        return;
      }

      await database.delete(table).where(eq(pkColumn, id as any));
    },
  } as const;
}
