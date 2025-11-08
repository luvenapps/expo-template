import 'react-native-get-random-values';
import { Platform } from 'react-native';
import { v4 as uuid } from 'uuid';
import { DOMAIN } from '@/config/domain.config';
import { getDb } from '@/db/sqlite';
import { withDatabaseRetry } from '@/db/sqlite/retry';
import { getPrimaryEntityRepository } from '@/data/repositories';
import {
  VALID_CADENCES,
  assertHexColor,
  assertIntegerInRange,
  assertIsoDateTime,
  assertMaxLength,
  assertNonEmptyString,
  assertOneOf,
} from '@/data/validation';
import { mapPayloadToRemote, normalizePayload } from '@/supabase/mappers';
import type { PrimaryEntityRecord } from '@/supabase/types';
import { enqueueWithDatabase } from '@/sync/outbox';
import type { LocalTableName } from '@/supabase/domain';

type CreatePrimaryEntityInput = {
  id?: string;
  userId: string;
  name: string;
  cadence: string;
  color: string;
  sortOrder?: number;
  isArchived?: boolean;
};

type UpdatePrimaryEntityInput = {
  id: string;
  name?: string;
  cadence?: string;
  color?: string;
  sortOrder?: number;
  isArchived?: boolean;
  deletedAt?: string | null;
};

const LOCAL_TABLE = DOMAIN.entities.primary.tableName as LocalTableName;

type MutationOptions = {
  database?: Awaited<ReturnType<typeof getDb>>;
};

export async function createPrimaryEntityLocal(
  input: CreatePrimaryEntityInput,
  options?: MutationOptions,
) {
  guardNative();
  validatePrimaryCreateInput(input);
  const runInsert = async (database: Awaited<ReturnType<typeof getDb>>) => {
    const repo = getPrimaryEntityRepository(database);
    const id = input.id ?? uuid();

    const timestamp = new Date().toISOString();

    await repo.insert({
      id,
      userId: input.userId,
      name: input.name,
      cadence: input.cadence,
      color: input.color,
      sortOrder: input.sortOrder ?? 0,
      isArchived: input.isArchived ?? false,
      version: 1,
      deletedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    const stored = await repo.findById(id);
    if (!stored) {
      throw new Error('Failed to create primary entity.');
    }

    await enqueueWithDatabase(database, {
      tableName: DOMAIN.entities.primary.tableName,
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

export async function updatePrimaryEntityLocal(input: UpdatePrimaryEntityInput) {
  guardNative();
  validatePrimaryUpdateInput(input);
  return withDatabaseRetry(async () => {
    const database = await getDb();
    const repo = getPrimaryEntityRepository(database);
    const existing = await repo.findById(input.id);

    if (!existing) {
      throw new Error(`Primary entity ${input.id} not found.`);
    }

    const version = (existing.version ?? 0) + 1;
    const updates: Partial<PrimaryEntityRecord> = { version };

    if (input.name !== undefined) updates.name = input.name;
    if (input.cadence !== undefined) updates.cadence = input.cadence;
    if (input.color !== undefined) updates.color = input.color;
    if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;
    if (input.isArchived !== undefined) updates.isArchived = input.isArchived;
    if (input.deletedAt !== undefined) updates.deletedAt = input.deletedAt;

    await repo.update(input.id, updates);

    const stored = await repo.findById(input.id);

    if (!stored) {
      throw new Error(`Primary entity ${input.id} missing after update.`);
    }

    await enqueueWithDatabase(database, {
      tableName: DOMAIN.entities.primary.tableName,
      rowId: stored.id,
      operation: 'update',
      payload: buildRemotePayload(stored),
      version: stored.version,
    });

    return stored;
  });
}

export async function deletePrimaryEntityLocal(id: string) {
  guardNative();
  return withDatabaseRetry(async () => {
    const database = await getDb();
    const repo = getPrimaryEntityRepository(database);
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
      tableName: DOMAIN.entities.primary.tableName,
      rowId: stored.id,
      operation: 'delete',
      payload: buildRemotePayload(stored),
      version: stored.version,
    });

    return stored;
  });
}

function buildRemotePayload(record: PrimaryEntityRecord) {
  return normalizePayload(mapPayloadToRemote(LOCAL_TABLE, record));
}

function guardNative() {
  if (Platform.OS === 'web') {
    throw new Error('Local SQLite mutations are not supported on web.');
  }
}

function validatePrimaryCreateInput(input: CreatePrimaryEntityInput) {
  assertNonEmptyString(input.userId, 'User ID');
  assertNonEmptyString(input.name, 'Name');
  assertMaxLength(input.name, 200, 'Name');
  assertHexColor(input.color, 'Color');
  assertOneOf(input.cadence, VALID_CADENCES, 'Cadence');
  if (input.sortOrder !== undefined) {
    assertIntegerInRange(input.sortOrder, 0, 10000, 'Sort order');
  }
}

function validatePrimaryUpdateInput(input: UpdatePrimaryEntityInput) {
  if (input.name !== undefined) {
    assertNonEmptyString(input.name, 'Name');
    assertMaxLength(input.name, 200, 'Name');
  }
  if (input.color !== undefined) {
    assertHexColor(input.color, 'Color');
  }
  if (input.cadence !== undefined) {
    assertOneOf(input.cadence, VALID_CADENCES, 'Cadence');
  }
  if (input.sortOrder !== undefined) {
    assertIntegerInRange(input.sortOrder, 0, 10000, 'Sort order');
  }
  if (input.deletedAt && typeof input.deletedAt === 'string') {
    assertIsoDateTime(input.deletedAt, 'Deleted at');
  }
}
