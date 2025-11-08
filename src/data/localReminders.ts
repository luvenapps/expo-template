import 'react-native-get-random-values';
import { Platform } from 'react-native';
import { v4 as uuid } from 'uuid';
import { DOMAIN } from '@/config/domain.config';
import { getDb } from '@/db/sqlite';
import { withDatabaseRetry } from '@/db/sqlite/retry';
import { getReminderRepository } from '@/data/repositories';
import { mapPayloadToRemote, normalizePayload } from '@/supabase/mappers';
import type { ReminderRecord } from '@/supabase/types';
import { enqueueWithDatabase } from '@/sync/outbox';
import type { LocalTableName } from '@/supabase/domain';
import { toSnakeCase } from '@/utils/string';
import {
  assertDaysOfWeek,
  assertIsoDateTime,
  assertNonEmptyString,
  assertTimeOfDay,
} from '@/data/validation';

const LOCAL_TABLE = DOMAIN.entities.reminders.tableName as LocalTableName;
const FOREIGN_KEY = DOMAIN.entities.reminders.foreignKey;
const REMOTE_FOREIGN_KEY = toSnakeCase(FOREIGN_KEY);
const REMINDER_FOREIGN_KEY_LABEL = `${DOMAIN.entities.primary.displayName} ID`;

type CreateReminderInput = {
  id?: string;
  userId: string;
  [FOREIGN_KEY]: string;
  timeLocal: string;
  daysOfWeek: string;
  timezone?: string;
  isEnabled?: boolean;
};

type UpdateReminderInput = {
  id: string;
  [FOREIGN_KEY]?: string;
  timeLocal?: string;
  daysOfWeek?: string;
  timezone?: string;
  isEnabled?: boolean;
  deletedAt?: string | null;
};

type MutationOptions = {
  database?: Awaited<ReturnType<typeof getDb>>;
};

export async function createReminderLocal(input: CreateReminderInput, options?: MutationOptions) {
  guardNative();
  validateReminderCreateInput(input);
  const runInsert = async (database: Awaited<ReturnType<typeof getDb>>) => {
    const repo = getReminderRepository(database);
    const id = input.id ?? uuid();

    const timestamp = new Date().toISOString();

    await repo.insert({
      id,
      userId: input.userId,
      [FOREIGN_KEY]: input[FOREIGN_KEY],
      timeLocal: input.timeLocal,
      daysOfWeek: input.daysOfWeek,
      timezone: input.timezone ?? 'UTC',
      isEnabled: input.isEnabled ?? true,
      version: 1,
      deletedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    } as ReminderRecord);

    const stored = await repo.findById(id);
    if (!stored) {
      throw new Error('Failed to create reminder.');
    }

    await enqueueWithDatabase(database, {
      tableName: DOMAIN.entities.reminders.tableName,
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

export async function updateReminderLocal(input: UpdateReminderInput) {
  guardNative();
  validateReminderUpdateInput(input);
  return withDatabaseRetry(async () => {
    const database = await getDb();
    const repo = getReminderRepository(database);
    const existing = await repo.findById(input.id);

    if (!existing) {
      throw new Error(`Reminder ${input.id} not found.`);
    }

    const version = (existing.version ?? 0) + 1;
    const updates: Partial<ReminderRecord> = { version };

    if (input[FOREIGN_KEY] !== undefined) {
      updates[FOREIGN_KEY] = input[FOREIGN_KEY] as ReminderRecord[typeof FOREIGN_KEY];
    }
    if (input.timeLocal !== undefined) updates.timeLocal = input.timeLocal;
    if (input.daysOfWeek !== undefined) updates.daysOfWeek = input.daysOfWeek;
    if (input.timezone !== undefined) updates.timezone = input.timezone;
    if (input.isEnabled !== undefined) updates.isEnabled = input.isEnabled;
    if (input.deletedAt !== undefined) updates.deletedAt = input.deletedAt;

    await repo.update(input.id, updates);

    const stored = await repo.findById(input.id);
    if (!stored) {
      throw new Error(`Reminder ${input.id} missing after update.`);
    }

    await enqueueWithDatabase(database, {
      tableName: DOMAIN.entities.reminders.tableName,
      rowId: stored.id,
      operation: 'update',
      payload: buildRemotePayload(stored),
      version: stored.version,
    });

    return stored;
  });
}

export async function deleteReminderLocal(id: string) {
  guardNative();
  return withDatabaseRetry(async () => {
    const database = await getDb();
    const repo = getReminderRepository(database);
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
      tableName: DOMAIN.entities.reminders.tableName,
      rowId: stored.id,
      operation: 'delete',
      payload: buildRemotePayload(stored),
      version: stored.version,
    });

    return stored;
  });
}

function buildRemotePayload(record: ReminderRecord) {
  const payload = mapPayloadToRemote(LOCAL_TABLE, record);
  payload[REMOTE_FOREIGN_KEY] = record[FOREIGN_KEY];
  return normalizePayload(payload);
}

function guardNative() {
  if (Platform.OS === 'web') {
    throw new Error('Local SQLite mutations are not supported on web.');
  }
}

function validateReminderCreateInput(input: CreateReminderInput) {
  assertNonEmptyString(input.userId, 'User ID');
  assertNonEmptyString(input[FOREIGN_KEY], REMINDER_FOREIGN_KEY_LABEL);
  assertTimeOfDay(input.timeLocal, 'Reminder time');
  assertDaysOfWeek(input.daysOfWeek, 'Reminder days');
  if (input.timezone !== undefined) {
    assertNonEmptyString(input.timezone, 'Timezone');
  }
}

function validateReminderUpdateInput(input: UpdateReminderInput) {
  if (input[FOREIGN_KEY] !== undefined) {
    assertNonEmptyString(input[FOREIGN_KEY], REMINDER_FOREIGN_KEY_LABEL);
  }
  if (input.timeLocal !== undefined) {
    assertTimeOfDay(input.timeLocal, 'Reminder time');
  }
  if (input.daysOfWeek !== undefined) {
    assertDaysOfWeek(input.daysOfWeek, 'Reminder days');
  }
  if (input.timezone !== undefined) {
    assertNonEmptyString(input.timezone, 'Timezone');
  }
  if (input.deletedAt && typeof input.deletedAt === 'string') {
    assertIsoDateTime(input.deletedAt, 'Deleted at');
  }
}
