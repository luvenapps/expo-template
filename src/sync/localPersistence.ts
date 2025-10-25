import type { AnySQLiteTable } from 'drizzle-orm/sqlite-core';
import { getDb } from '@/db/sqlite';

type RegisteredTable<TRow extends Record<string, unknown>> = {
  table: AnySQLiteTable;
  primaryKey: unknown;
  prepareRow?: (row: TRow) => Record<string, unknown>;
};

const registry = new Map<string, RegisteredTable<Record<string, unknown>>>();

export function registerPersistenceTable<TRow extends Record<string, unknown>>(
  tableName: string,
  config: RegisteredTable<TRow>,
) {
  registry.set(tableName, config as RegisteredTable<Record<string, unknown>>);
}

export function resetPersistenceRegistry() {
  registry.clear();
}

export async function upsertRecords<TRow extends Record<string, unknown>>(
  tableName: string,
  rows: TRow[],
) {
  if (!rows.length) return;

  const config = registry.get(tableName);
  if (!config) {
    throw new Error(`No persistence table registered for "${tableName}".`);
  }

  const db = await getDb();
  const { table, primaryKey, prepareRow } = config;

  for (const row of rows) {
    const preparedRow = (prepareRow ? prepareRow(row) : row) as Record<string, unknown>;
    await db.insert(table).values(preparedRow).onConflictDoUpdate({
      target: primaryKey,
      set: preparedRow,
    });
  }
}
