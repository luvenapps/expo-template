import { supabase } from '@/auth/client';
import { useSessionStore } from '@/auth/session';
import { DOMAIN } from '@/config/domain.config';
import { deviceEntity, entryEntity, primaryEntity, reminderEntity } from '@/db/sqlite';
import {
  mapRemoteDeviceEntities,
  mapRemoteEntryEntities,
  mapRemotePrimaryEntities,
  mapRemoteReminderEntities,
} from '@/supabase/remoteMappers';
import { Platform } from 'react-native';
import { clearCursor, getCursor, setCursor } from './cursors';
import { registerPersistenceTable, upsertRecords } from './localPersistence';
import type { OutboxRecord } from './outbox';

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
const SYNC_WINDOW_YEARS = 2;

function getWindowStartIso() {
  const now = new Date();
  const startYear = now.getUTCFullYear() - 1; // include current + previous year starting January
  const windowStart = new Date(Date.UTC(startYear, 0, 1, 0, 0, 0, 0));
  return windowStart.toISOString();
}

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

  const windowStart = SYNC_WINDOW_YEARS > 0 ? getWindowStartIso() : null;

  const { data, error } = await supabase.functions.invoke<SyncPullResponse>('sync-pull', {
    body: { cursors: cursorMap, windowStart },
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
  const primaryRows = mapRemotePrimaryEntities(
    records[DOMAIN.entities.primary.remoteTableName as RemoteTable],
  );
  const entryRows = mapRemoteEntryEntities(
    records[DOMAIN.entities.entries.remoteTableName as RemoteTable],
  );
  const reminderRows = mapRemoteReminderEntities(
    records[DOMAIN.entities.reminders.remoteTableName as RemoteTable],
  );
  const deviceRows = mapRemoteDeviceEntities(
    records[DOMAIN.entities.devices.remoteTableName as RemoteTable],
  );

  await Promise.all([
    upsertRecords(DOMAIN.entities.primary.tableName, primaryRows),
    upsertRecords(DOMAIN.entities.entries.tableName, entryRows),
    upsertRecords(DOMAIN.entities.reminders.tableName, reminderRows),
    upsertRecords(DOMAIN.entities.devices.tableName, deviceRows),
  ]);
}

function parsePayload(json: string) {
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}
