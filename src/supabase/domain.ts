import { DOMAIN } from '@/config/domain.config';

export const LOCAL_TO_REMOTE_TABLE = {
  [DOMAIN.entities.primary.tableName]: DOMAIN.entities.primary.remoteTableName,
  [DOMAIN.entities.entries.tableName]: DOMAIN.entities.entries.remoteTableName,
  [DOMAIN.entities.reminders.tableName]: DOMAIN.entities.reminders.remoteTableName,
  [DOMAIN.entities.devices.tableName]: DOMAIN.entities.devices.remoteTableName,
} as const;

export type LocalTableName = keyof typeof LOCAL_TO_REMOTE_TABLE;
export type RemoteTableName = (typeof LOCAL_TO_REMOTE_TABLE)[LocalTableName];

export type MutationOperation = 'insert' | 'update' | 'delete';

export const COLUMN_MAPPINGS: Record<LocalTableName, Record<string, string>> = {
  [DOMAIN.entities.primary.tableName]: {
    userId: 'user_id',
    name: 'name',
    cadence: 'cadence',
    color: 'color',
    sortOrder: 'sort_order',
    isArchived: 'is_archived',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    version: 'version',
    deletedAt: 'deleted_at',
  },
  [DOMAIN.entities.entries.tableName]: {
    userId: 'user_id',
    [DOMAIN.entities.entries.foreignKey]: 'habit_id',
    date: 'date',
    amount: 'amount',
    source: 'source',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    version: 'version',
    deletedAt: 'deleted_at',
  },
  [DOMAIN.entities.reminders.tableName]: {
    userId: 'user_id',
    [DOMAIN.entities.entries.foreignKey]: 'habit_id',
    timeLocal: 'time_local',
    daysOfWeek: 'days_of_week',
    timezone: 'timezone',
    isEnabled: 'is_enabled',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    version: 'version',
    deletedAt: 'deleted_at',
  },
  [DOMAIN.entities.devices.tableName]: {
    userId: 'user_id',
    platform: 'platform',
    lastSyncAt: 'last_sync_at',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    version: 'version',
    deletedAt: 'deleted_at',
  },
};

export const MERGE_UNIQUE_CONSTRAINTS: Partial<
  Record<LocalTableName, { columns: string[]; condition?: string }>
> = {
  [DOMAIN.entities.entries.tableName]: {
    columns: ['habit_id', 'date'],
    condition: 'deleted_at IS NULL',
  },
};

export function toRemoteTable(table: LocalTableName): RemoteTableName {
  return LOCAL_TO_REMOTE_TABLE[table];
}
