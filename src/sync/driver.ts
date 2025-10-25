import { Platform } from 'react-native';
import { supabase } from '@/auth/client';
import { useSessionStore } from '@/auth/session';
import { getCursor, setCursor, clearCursor } from './cursors';
import type { OutboxRecord } from './outbox';
import { upsertRecords, registerPersistenceTable } from './localPersistence';
import { habits, habitEntries, reminders, devices } from '@/db/sqlite';

type HabitRecord = typeof habits.$inferInsert;
type HabitEntryRecord = typeof habitEntries.$inferInsert;
type ReminderRecord = typeof reminders.$inferInsert;
type DeviceRecord = typeof devices.$inferInsert;

registerPersistenceTable('habits', {
  table: habits,
  primaryKey: habits.id,
});

registerPersistenceTable('habit_entries', {
  table: habitEntries,
  primaryKey: habitEntries.id,
});

registerPersistenceTable('reminders', {
  table: reminders,
  primaryKey: reminders.id,
});

registerPersistenceTable('devices', {
  table: devices,
  primaryKey: devices.id,
});

const SYNC_TABLES = ['habits', 'habit_entries', 'reminders', 'devices'] as const;

type SyncTable = (typeof SYNC_TABLES)[number];

type SyncPushMutation = {
  id: string;
  table: SyncTable;
  operation: OutboxRecord['operation'];
  version: number;
  payload: Record<string, unknown>;
};

type SyncPushResponse = {
  success: true;
  updated?: Partial<Record<SyncTable, unknown[]>>;
};

type SyncPullResponse = {
  success: true;
  cursors: Partial<Record<SyncTable, string | null>>;
  records: Partial<Record<SyncTable, RemoteRow[]>>;
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

async function applyRemoteRecords(records: Partial<Record<SyncTable, RemoteRow[]>>) {
  const habitRows = mapHabits(records.habits);
  const habitEntryRows = mapHabitEntries(records.habit_entries);
  const reminderRows = mapReminders(records.reminders);
  const deviceRows = mapDevices(records.devices);

  await Promise.all([
    upsertRecords('habits', habitRows),
    upsertRecords('habit_entries', habitEntryRows),
    upsertRecords('reminders', reminderRows),
    upsertRecords('devices', deviceRows),
  ]);
}

function mapHabits(rows: RemoteRow[] | undefined): HabitRecord[] {
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

function mapHabitEntries(rows: RemoteRow[] | undefined): HabitEntryRecord[] {
  if (!rows?.length) return [];
  return rows
    .filter((row) => row?.id && row?.user_id && row?.habit_id && row?.date)
    .map((row) => ({
      id: String(row.id),
      userId: String(row.user_id),
      habitId: String(row.habit_id),
      date: String(row.date),
      amount: Number(row.amount ?? 0),
      source: String(row.source ?? 'remote'),
      createdAt: String(row.created_at ?? new Date().toISOString()),
      updatedAt: String(row.updated_at ?? new Date().toISOString()),
      version: Number(row.version ?? 1),
      deletedAt: row.deleted_at ? String(row.deleted_at) : null,
    }));
}

function mapReminders(rows: RemoteRow[] | undefined): ReminderRecord[] {
  if (!rows?.length) return [];
  return rows
    .filter((row) => row?.id && row?.user_id && row?.habit_id)
    .map((row) => ({
      id: String(row.id),
      userId: String(row.user_id),
      habitId: String(row.habit_id),
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
