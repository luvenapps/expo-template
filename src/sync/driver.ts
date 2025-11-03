import { supabase } from '@/auth/client';
import { useSessionStore } from '@/auth/session';
import { DOMAIN } from '@/config/domain.config';
import { deviceEntity, entryEntity, primaryEntity, reminderEntity } from '@/db/sqlite';
import { Platform } from 'react-native';
import { clearCursor, getCursor, setCursor } from './cursors';
import { registerPersistenceTable, upsertRecords } from './localPersistence';
import type { OutboxRecord } from './outbox';

/**
 * Generic type aliases for entity records
 * Inferred from Drizzle schema definitions
 */
export type PrimaryEntityRecord = typeof primaryEntity.$inferInsert;
export type EntryRecord = typeof entryEntity.$inferInsert;
export type ReminderRecord = typeof reminderEntity.$inferInsert;
export type DeviceRecord = typeof deviceEntity.$inferInsert;

// Register all syncable tables with the persistence layer
registerPersistenceTable(DOMAIN.entities.primary.tableName, {
  table: primaryEntity,
  primaryKey: primaryEntity.id,
});

registerPersistenceTable(DOMAIN.entities.entries.tableName, {
  table: entryEntity,
  primaryKey: entryEntity.id,
});

registerPersistenceTable(DOMAIN.entities.reminders.tableName, {
  table: reminderEntity,
  primaryKey: reminderEntity.id,
});

registerPersistenceTable(DOMAIN.entities.devices.tableName, {
  table: deviceEntity,
  primaryKey: deviceEntity.id,
});

// Build sync tables list from domain configuration
const SYNC_TABLES = [
  DOMAIN.entities.primary.tableName,
  DOMAIN.entities.entries.tableName,
  DOMAIN.entities.reminders.tableName,
  DOMAIN.entities.devices.tableName,
] as const;

type SyncTable = (typeof SYNC_TABLES)[number];

// Used only for type extraction - not as a runtime value
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const REMOTE_TABLES = [
  DOMAIN.entities.primary.remoteTableName,
  DOMAIN.entities.entries.remoteTableName,
  DOMAIN.entities.reminders.remoteTableName,
  DOMAIN.entities.devices.remoteTableName,
] as const;

type RemoteTable = (typeof REMOTE_TABLES)[number];

type SyncPushMutation = {
  id: string;
  table: SyncTable;
  operation: OutboxRecord['operation'];
  version: number;
  payload: Record<string, unknown>;
};

type SyncPushResponse = {
  success: true;
  updated?: Partial<Record<RemoteTable, RemoteRow[]>>;
};

type SyncPullResponse = {
  success: true;
  cursors: Partial<Record<SyncTable, string | null>>;
  records: Partial<Record<RemoteTable, RemoteRow[]>>;
};

type RemoteRow = Record<string, unknown>;

const PLATFORM_UNSUPPORTED_ERROR =
  'Sync is only available on iOS and Android. Please use native builds to synchronise data.';

export async function pushOutbox(records: OutboxRecord[]) {
  if (!records.length) return;
  if (Platform.OS === 'web') {
    throw new Error(PLATFORM_UNSUPPORTED_ERROR);
  }

  const session = useSessionStore.getState().session;
  if (!session) {
    throw new Error('Sign in to sync changes across your devices.');
  }

  const mutations: SyncPushMutation[] = records.map((record) => ({
    id: record.rowId,
    table: record.tableName as SyncTable,
    operation: record.operation,
    version: record.version,
    payload: parsePayload(record.payload),
  }));

  const { data, error } = await supabase.functions.invoke<SyncPushResponse>('sync-push', {
    body: { mutations },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.success) {
    throw new Error('Unexpected response from sync push function.');
  }

  if (data.updated) {
    await applyRemoteRecords(data.updated);
  }
}

export async function pullUpdates() {
  if (Platform.OS === 'web') {
    throw new Error(PLATFORM_UNSUPPORTED_ERROR);
  }

  const session = useSessionStore.getState().session;
  if (!session) {
    throw new Error('Sign in to pull updates from your Supabase account.');
  }

  const cursorMap = Object.fromEntries(
    SYNC_TABLES.map((table) => [table, getCursor(`sync:${table}`)]),
  ) as Record<SyncTable, string | null>;

  const { data, error } = await supabase.functions.invoke<SyncPullResponse>('sync-pull', {
    body: { cursors: cursorMap },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.success) {
    throw new Error('Unexpected response from sync pull function.');
  }

  const records = data.records ?? {};

  await applyRemoteRecords(records);

  const cursors = data.cursors ?? {};
  SYNC_TABLES.forEach((table) => {
    const cursor = cursors[table];
    if (cursor) {
      setCursor(`sync:${table}`, cursor);
    } else {
      clearCursor(`sync:${table}`);
    }
  });
}

async function applyRemoteRecords(records: Partial<Record<RemoteTable, RemoteRow[]>>) {
  // Map remote records using remote table names from config
  const primaryRows = mapPrimaryEntities(
    records[DOMAIN.entities.primary.remoteTableName as RemoteTable],
  );
  const entryRows = mapEntries(records[DOMAIN.entities.entries.remoteTableName as RemoteTable]);
  const reminderRows = mapReminders(
    records[DOMAIN.entities.reminders.remoteTableName as RemoteTable],
  );
  const deviceRows = mapDevices(records[DOMAIN.entities.devices.remoteTableName as RemoteTable]);

  // Upsert to local tables using local table names from config
  await Promise.all([
    upsertRecords(DOMAIN.entities.primary.tableName, primaryRows),
    upsertRecords(DOMAIN.entities.entries.tableName, entryRows),
    upsertRecords(DOMAIN.entities.reminders.tableName, reminderRows),
    upsertRecords(DOMAIN.entities.devices.tableName, deviceRows),
  ]);
}

/**
 * Maps remote primary entity records to local schema
 */
function mapPrimaryEntities(rows: RemoteRow[] | undefined): PrimaryEntityRecord[] {
  if (!rows?.length) return [];
  return rows
    .filter((row) => row?.id && row?.user_id)
    .map((row) => ({
      id: String(row.id),
      userId: String(row.user_id),
      name: String(row.name ?? ''),
      cadence: String(row.cadence ?? 'daily'),
      color: String(row.color ?? '#ffffff'),
      sortOrder: Number(row.sort_order ?? 0),
      isArchived: Boolean(row.is_archived ?? false),
      createdAt: String(row.created_at ?? new Date().toISOString()),
      updatedAt: String(row.updated_at ?? new Date().toISOString()),
      version: Number(row.version ?? 1),
      deletedAt: row.deleted_at ? String(row.deleted_at) : null,
    }));
}

/**
 * Maps remote entry records to local schema
 */
function mapEntries(rows: RemoteRow[] | undefined): EntryRecord[] {
  if (!rows?.length) return [];
  return rows
    .filter((row) => row?.id && row?.user_id && row[DOMAIN.entities.entries.row_id] && row?.date)
    .map((row) => ({
      id: String(row.id),
      userId: String(row.user_id),
      [DOMAIN.entities.entries.foreignKey]: String(row[DOMAIN.entities.entries.row_id]),
      date: String(row.date),
      amount: Number(row.amount ?? 0),
      source: String(row.source ?? 'remote'),
      createdAt: String(row.created_at ?? new Date().toISOString()),
      updatedAt: String(row.updated_at ?? new Date().toISOString()),
      version: Number(row.version ?? 1),
      deletedAt: row.deleted_at ? String(row.deleted_at) : null,
    }));
}

/**
 * Maps remote reminder records to local schema
 */
function mapReminders(rows: RemoteRow[] | undefined): ReminderRecord[] {
  if (!rows?.length) return [];
  return rows
    .filter((row) => row?.id && row?.user_id && row[DOMAIN.entities.entries.row_id])
    .map((row) => ({
      id: String(row.id),
      userId: String(row.user_id),
      [DOMAIN.entities.entries.foreignKey]: String(row[DOMAIN.entities.entries.row_id]),
      timeLocal: String(row.time_local ?? '09:00'),
      daysOfWeek: String(row.days_of_week ?? ''),
      timezone: String(row.timezone ?? 'UTC'),
      isEnabled: Boolean(row.is_enabled ?? true),
      createdAt: String(row.created_at ?? new Date().toISOString()),
      updatedAt: String(row.updated_at ?? new Date().toISOString()),
      version: Number(row.version ?? 1),
      deletedAt: row.deleted_at ? String(row.deleted_at) : null,
    }));
}

/**
 * Maps remote device records to local schema
 */
function mapDevices(rows: RemoteRow[] | undefined): DeviceRecord[] {
  if (!rows?.length) return [];
  return rows
    .filter((row) => row?.id && row?.user_id)
    .map((row) => ({
      id: String(row.id),
      userId: String(row.user_id),
      platform: String(row.platform ?? 'unknown'),
      lastSyncAt: row.last_sync_at ? String(row.last_sync_at) : null,
      createdAt: String(row.created_at ?? new Date().toISOString()),
      updatedAt: String(row.updated_at ?? new Date().toISOString()),
      version: Number(row.version ?? 1),
      deletedAt: row.deleted_at ? String(row.deleted_at) : null,
    }));
}

function parsePayload(json: string) {
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}
