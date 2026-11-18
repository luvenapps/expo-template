import { DOMAIN } from '@/config/domain.config';
import type { DeviceRecord, EntryRecord, PrimaryEntityRecord, ReminderRecord } from './types';
import { toSnakeCase } from '@/utils/string';

type RemoteRow = Record<string, unknown>;

const REMOTE_USER_COLUMN = 'user_id';
const REMOTE_DELETED_COLUMN = 'deleted_at';

const REMOTE_ENTRY_FOREIGN_KEY = DOMAIN.entities.entries.row_id;
const REMOTE_REMINDER_FOREIGN_KEY = toSnakeCase(DOMAIN.entities.reminders.foreignKey);

export function mapRemotePrimaryEntities(rows: RemoteRow[] | undefined): PrimaryEntityRecord[] {
  if (!rows?.length) return [];

  return rows
    .filter((row) => row?.id && row?.[REMOTE_USER_COLUMN])
    .map((row) => ({
      id: String(row.id),
      userId: String(row[REMOTE_USER_COLUMN]),
      name: String(row.name ?? ''),
      cadence: String(row.cadence ?? 'daily'),
      color: String(row.color ?? '#ffffff'),
      sortOrder: Number(row.sort_order ?? 0),
      isArchived: Boolean(row.is_archived ?? false),
      createdAt: String(row.created_at ?? new Date().toISOString()),
      updatedAt: String(row.updated_at ?? new Date().toISOString()),
      version: Number(row.version ?? 1),
      deletedAt: row[REMOTE_DELETED_COLUMN] ? String(row[REMOTE_DELETED_COLUMN]) : null,
    }));
}

export function mapRemoteEntryEntities(rows: RemoteRow[] | undefined): EntryRecord[] {
  if (!rows?.length) return [];

  return rows
    .filter((row) => row?.id && row?.[REMOTE_USER_COLUMN] && row?.[REMOTE_ENTRY_FOREIGN_KEY])
    .map((row) => ({
      id: String(row.id),
      userId: String(row[REMOTE_USER_COLUMN]),
      [DOMAIN.entities.entries.foreignKey]: String(row[REMOTE_ENTRY_FOREIGN_KEY]),
      date: String(row.date ?? new Date().toISOString().slice(0, 10)),
      amount: Number(row.amount ?? 0),
      source: String(row.source ?? 'remote'),
      createdAt: String(row.created_at ?? new Date().toISOString()),
      updatedAt: String(row.updated_at ?? new Date().toISOString()),
      version: Number(row.version ?? 1),
      deletedAt: row[REMOTE_DELETED_COLUMN] ? String(row[REMOTE_DELETED_COLUMN]) : null,
    }));
}

export function mapRemoteReminderEntities(rows: RemoteRow[] | undefined): ReminderRecord[] {
  if (!rows?.length) return [];

  return rows
    .filter((row) => row?.id && row?.[REMOTE_USER_COLUMN] && row?.[REMOTE_REMINDER_FOREIGN_KEY])
    .map((row) => ({
      id: String(row.id),
      userId: String(row[REMOTE_USER_COLUMN]),
      [DOMAIN.entities.reminders.foreignKey]: String(row[REMOTE_REMINDER_FOREIGN_KEY]),
      timeLocal: String(row.time_local ?? '09:00'),
      daysOfWeek: String(row.days_of_week ?? ''),
      timezone: String(row.timezone ?? 'UTC'),
      isEnabled: Boolean(row.is_enabled ?? true),
      createdAt: String(row.created_at ?? new Date().toISOString()),
      updatedAt: String(row.updated_at ?? new Date().toISOString()),
      version: Number(row.version ?? 1),
      deletedAt: row[REMOTE_DELETED_COLUMN] ? String(row[REMOTE_DELETED_COLUMN]) : null,
    }));
}

export function mapRemoteDeviceEntities(rows: RemoteRow[] | undefined): DeviceRecord[] {
  if (!rows?.length) return [];

  return rows
    .filter((row) => row?.id && row?.[REMOTE_USER_COLUMN])
    .map((row) => ({
      id: String(row.id),
      userId: String(row[REMOTE_USER_COLUMN]),
      platform: String(row.platform ?? 'unknown'),
      lastSyncAt: row.last_sync_at ? String(row.last_sync_at) : null,
      createdAt: String(row.created_at ?? new Date().toISOString()),
      updatedAt: String(row.updated_at ?? new Date().toISOString()),
      version: Number(row.version ?? 1),
      deletedAt: row[REMOTE_DELETED_COLUMN] ? String(row[REMOTE_DELETED_COLUMN]) : null,
    }));
}
