import 'react-native-get-random-values';
import { Platform } from 'react-native';
import { v4 as uuid } from 'uuid';
import { DOMAIN } from '@/config/domain.config';
import { getDb } from '@/db/sqlite';
import { withDatabaseRetry } from '@/db/sqlite/retry';
import { getEntryRepository } from '@/data/repositories';
import { mapPayloadToRemote, normalizePayload } from '@/supabase/mappers';
import type { EntryRecord } from '@/supabase/types';
import { enqueueWithDatabase } from '@/sync/outbox';
import type { LocalTableName } from '@/supabase/domain';

const LOCAL_TABLE = DOMAIN.entities.entries.tableName as LocalTableName;
const FOREIGN_KEY = DOMAIN.entities.entries.foreignKey;
const REMOTE_FOREIGN_KEY = DOMAIN.entities.entries.row_id;

type CreateEntryInput = {
  id?: string;
  userId: string;
  [FOREIGN_KEY]: string;
  date: string;
  amount?: number;
  source?: string;
};

type UpdateEntryInput = {
  id: string;
  [FOREIGN_KEY]?: string;
  date?: string;
  amount?: number;
  source?: string;
  deletedAt?: string | null;
};

type MutationOptions = {
  database?: Awaited<ReturnType<typeof getDb>>;
};

export async function createEntryLocal(input: CreateEntryInput, options?: MutationOptions) {
  guardNative();
  const runInsert = async (database: Awaited<ReturnType<typeof getDb>>) => {
    const repo = getEntryRepository(database);
    const id = input.id ?? uuid();

    const timestamp = new Date().toISOString();

    await repo.insert({
      id,
      userId: input.userId,
      [FOREIGN_KEY]: input[FOREIGN_KEY],
      date: input.date,
      amount: input.amount ?? 0,
      source: input.source ?? 'local',
      version: 1,
      deletedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    } as EntryRecord);

    const stored = await repo.findById(id);
    if (!stored) {
      throw new Error('Failed to create entry.');
    }

    await enqueueWithDatabase(database, {
      tableName: DOMAIN.entities.entries.tableName,
      rowId: stored.id,
      operation: 'insert',
      payload: buildRemotePayload(stored),
      version: stored.version,
    });

    return stored;
  };

  if (options?.database) {
    return runInsert(options.database);
  }

  return withDatabaseRetry(async () => {
    const database = await getDb();
    return runInsert(database);
  });
}

export async function updateEntryLocal(input: UpdateEntryInput) {
  guardNative();
  return withDatabaseRetry(async () => {
    const database = await getDb();
    const repo = getEntryRepository(database);
    const existing = await repo.findById(input.id);

    if (!existing) {
      throw new Error(`Entry ${input.id} not found.`);
    }

    const version = (existing.version ?? 0) + 1;
    const updates: Partial<EntryRecord> = { version };

    if (input[FOREIGN_KEY] !== undefined) {
      updates[FOREIGN_KEY] = input[FOREIGN_KEY] as EntryRecord[typeof FOREIGN_KEY];
    }
    if (input.date !== undefined) updates.date = input.date;
    if (input.amount !== undefined) updates.amount = input.amount;
    if (input.source !== undefined) updates.source = input.source;
    if (input.deletedAt !== undefined) updates.deletedAt = input.deletedAt;

    await repo.update(input.id, updates);

    const stored = await repo.findById(input.id);
    if (!stored) {
      throw new Error(`Entry ${input.id} missing after update.`);
    }

    await enqueueWithDatabase(database, {
      tableName: DOMAIN.entities.entries.tableName,
      rowId: stored.id,
      operation: 'update',
      payload: buildRemotePayload(stored),
      version: stored.version,
    });

    return stored;
  });
}

export async function deleteEntryLocal(id: string) {
  guardNative();
  return withDatabaseRetry(async () => {
    const database = await getDb();
    const repo = getEntryRepository(database);
    const existing = await repo.findById(id);

    if (!existing) {
      return null;
    }

    const version = (existing.version ?? 0) + 1;
    await repo.update(id, { version, deletedAt: new Date().toISOString() });

    const stored = await repo.findById(id);
    if (!stored) {
      return null;
    }

    await enqueueWithDatabase(database, {
      tableName: DOMAIN.entities.entries.tableName,
      rowId: stored.id,
      operation: 'delete',
      payload: buildRemotePayload(stored),
      version: stored.version,
    });

    return stored;
  });
}

function buildRemotePayload(record: EntryRecord) {
  const payload = mapPayloadToRemote(LOCAL_TABLE, record);
  payload[REMOTE_FOREIGN_KEY] = record[FOREIGN_KEY];
  return normalizePayload(payload);
}

function guardNative() {
  if (Platform.OS === 'web') {
    throw new Error('Local SQLite mutations are not supported on web.');
  }
}
