import 'react-native-get-random-values';
import { asc, eq, inArray, sql } from 'drizzle-orm';
import { getDb, outbox } from '@/db/sqlite';
import { createLogger } from '@/observability/logger';
import { v4 as uuidv4 } from 'uuid';

export type OutboxRecord = typeof outbox.$inferSelect;
export type OutboxOperation = 'insert' | 'update' | 'delete';

export type EnqueueParams = {
  tableName: OutboxRecord['tableName'];
  rowId: OutboxRecord['rowId'];
  operation: OutboxOperation;
  payload: Record<string, unknown>;
  version?: number;
};

const serializePayload = (payload: Record<string, unknown>) => JSON.stringify(payload);

let customDatabase: Awaited<ReturnType<typeof getDb>> | null = null;

type Database = Awaited<ReturnType<typeof getDb>>;
const logger = createLogger('Outbox');

async function getDatabase() {
  return customDatabase ?? (await getDb());
}

export function setOutboxDatabase(customDb: Awaited<ReturnType<typeof getDb>>) {
  customDatabase = customDb;
}

export function resetOutboxDatabase() {
  customDatabase = null;
}

async function insertOutboxRecord(
  database: Database,
  { tableName, rowId, operation, payload, version }: EnqueueParams,
) {
  const id = uuidv4();

  await database.insert(outbox).values({
    id,
    tableName,
    rowId,
    operation,
    payload: serializePayload(payload),
    version: version ?? 1,
    attempts: 0,
    createdAt: new Date().toISOString(),
  });

  return id;
}

export async function enqueue(params: EnqueueParams) {
  const database = await getDatabase();
  return insertOutboxRecord(database, params);
}

export async function enqueueWithDatabase(database: Database, params: EnqueueParams) {
  return insertOutboxRecord(database, params);
}

export async function getPending(limit = 100) {
  const database = await getDatabase();
  return database.select().from(outbox).orderBy(asc(outbox.createdAt)).limit(limit);
}

export async function markProcessed(ids: string[]) {
  if (!ids.length) return;
  const database = await getDatabase();
  await database.delete(outbox).where(inArray(outbox.id, ids));
}

export async function incrementAttempt(id: string) {
  const database = await getDatabase();
  await database
    .update(outbox)
    .set({ attempts: sql`${outbox.attempts} + 1` })
    .where(eq(outbox.id, id));
}

export async function clearTable(tableName: string) {
  const database = await getDatabase();
  await database.delete(outbox).where(eq(outbox.tableName, tableName));
}

export async function clearAll() {
  const database = await getDatabase();
  await database.delete(outbox);
}

export async function hasOutboxData(): Promise<boolean> {
  try {
    const database = await getDatabase();
    const result = await database
      .select({ count: sql<number>`count(*)` })
      .from(outbox)
      .limit(1);
    return (result[0]?.count ?? 0) > 0;
  } catch (error) {
    logger.error('Error checking for data:', error);
    return false;
  }
}

/**
 * NOTE: This import is intentionally placed at the bottom of the file.
 * We have a circular dependency between the database client and outbox:
 * 1. Database client emits reset events
 * 2. Outbox listens to those events to reset its cache
 * 3. But outbox also imports database client
 *
 * By importing and setting up the listener here, after all outbox code is defined,
 * we break the circular dependency chain during module initialization.
 */
// eslint-disable-next-line import/first
import { onDatabaseReset } from '@/db/sqlite/events';
onDatabaseReset(() => {
  resetOutboxDatabase();
});
