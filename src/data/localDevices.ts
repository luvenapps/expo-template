import 'react-native-get-random-values';
import { Platform } from 'react-native';
import { v4 as uuid } from 'uuid';
import { DOMAIN } from '@/config/domain.config';
import { getDb } from '@/db/sqlite';
import { withDatabaseRetry } from '@/db/sqlite/retry';
import { getDeviceRepository } from '@/data/repositories';
import { mapPayloadToRemote, normalizePayload } from '@/supabase/mappers';
import type { DeviceRecord } from '@/supabase/types';
import { enqueueWithDatabase } from '@/sync/outbox';
import type { LocalTableName } from '@/supabase/domain';
import { assertIsoDateTime, assertNonEmptyString } from '@/data/validation';

const LOCAL_TABLE = DOMAIN.entities.devices.tableName as LocalTableName;

type CreateDeviceInput = {
  id?: string;
  userId: string;
  platform: string;
  lastSyncAt?: string | null;
};

type UpdateDeviceInput = {
  id: string;
  platform?: string;
  lastSyncAt?: string | null;
  deletedAt?: string | null;
};

type MutationOptions = {
  database?: Awaited<ReturnType<typeof getDb>>;
};

export async function createDeviceLocal(input: CreateDeviceInput, options?: MutationOptions) {
  guardNative();
  validateDeviceCreateInput(input);
  const runInsert = async (database: Awaited<ReturnType<typeof getDb>>) => {
    const repo = getDeviceRepository(database);
    const id = input.id ?? uuid();

    const timestamp = new Date().toISOString();

    await repo.insert({
      id,
      userId: input.userId,
      platform: input.platform,
      lastSyncAt: input.lastSyncAt ?? null,
      version: 1,
      deletedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    } as DeviceRecord);

    const stored = await repo.findById(id);
    if (!stored) {
      throw new Error('Failed to create device record.');
    }

    await enqueueWithDatabase(database, {
      tableName: DOMAIN.entities.devices.tableName,
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

export async function updateDeviceLocal(input: UpdateDeviceInput) {
  guardNative();
  validateDeviceUpdateInput(input);
  return withDatabaseRetry(async () => {
    const database = await getDb();
    const repo = getDeviceRepository(database);
    const existing = await repo.findById(input.id);

    if (!existing) {
      throw new Error(`Device ${input.id} not found.`);
    }

    const version = (existing.version ?? 0) + 1;
    const updates: Partial<DeviceRecord> = { version };

    if (input.platform !== undefined) updates.platform = input.platform;
    if (input.lastSyncAt !== undefined) updates.lastSyncAt = input.lastSyncAt;
    if (input.deletedAt !== undefined) updates.deletedAt = input.deletedAt;

    await repo.update(input.id, updates);

    const stored = await repo.findById(input.id);
    if (!stored) {
      throw new Error(`Device ${input.id} missing after update.`);
    }

    await enqueueWithDatabase(database, {
      tableName: DOMAIN.entities.devices.tableName,
      rowId: stored.id,
      operation: input.deletedAt ? 'delete' : 'update',
      payload: buildRemotePayload(stored),
      version: stored.version,
    });

    return stored;
  });
}

export async function deleteDeviceLocal(id: string) {
  guardNative();
  return withDatabaseRetry(async () => {
    const database = await getDb();
    const repo = getDeviceRepository(database);
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
      tableName: DOMAIN.entities.devices.tableName,
      rowId: stored.id,
      operation: 'delete',
      payload: buildRemotePayload(stored),
      version: stored.version,
    });

    return stored;
  });
}

function buildRemotePayload(record: DeviceRecord) {
  return normalizePayload(mapPayloadToRemote(LOCAL_TABLE, record));
}

function guardNative() {
  if (Platform.OS === 'web') {
    throw new Error('Local SQLite mutations are not supported on web.');
  }
}

function validateDeviceCreateInput(input: CreateDeviceInput) {
  assertNonEmptyString(input.userId, 'User ID');
  assertNonEmptyString(input.platform, 'Platform');
  if (input.lastSyncAt) {
    assertIsoDateTime(input.lastSyncAt, 'Last sync time');
  }
}

function validateDeviceUpdateInput(input: UpdateDeviceInput) {
  if (input.platform !== undefined) {
    assertNonEmptyString(input.platform, 'Platform');
  }
  if (input.lastSyncAt) {
    assertIsoDateTime(input.lastSyncAt, 'Last sync time');
  }
  if (input.deletedAt && typeof input.deletedAt === 'string') {
    assertIsoDateTime(input.deletedAt, 'Deleted at');
  }
}
