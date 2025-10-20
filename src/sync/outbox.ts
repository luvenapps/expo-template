import { asc, eq, inArray, sql } from 'drizzle-orm';
import { db, outbox } from '@/db/sqlite';
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

let database = db;

export function setOutboxDatabase(customDb: typeof db) {
  database = customDb;
}

export function resetOutboxDatabase() {
  database = db;
}

export async function enqueue({ tableName, rowId, operation, payload, version }: EnqueueParams) {
  const id = uuidv4();

  await database.insert(outbox).values({
    id,
    tableName,
    rowId,
    operation,
    payloadJson: serializePayload(payload),
    version: version ?? 1,
    attempts: 0,
    createdAt: new Date().toISOString(),
  });

  return id;
}

export async function getPending(limit = 100) {
  return database.select().from(outbox).orderBy(asc(outbox.createdAt)).limit(limit);
}

export async function markProcessed(ids: string[]) {
  if (!ids.length) return;
  await database.delete(outbox).where(inArray(outbox.id, ids));
}

export async function incrementAttempt(id: string) {
  await database
    .update(outbox)
    .set({ attempts: sql`${outbox.attempts} + 1` })
    .where(eq(outbox.id, id));
}

export async function clearTable(tableName: string) {
  await database.delete(outbox).where(eq(outbox.tableName, tableName));
}

export async function clearAll() {
  await database.delete(outbox);
}
