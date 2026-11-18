import type { Database } from '@/db/sqlite';
import {
  createRepository,
  deviceEntity,
  entryEntity,
  primaryEntity,
  reminderEntity,
} from '@/db/sqlite';

export function getPrimaryEntityRepository(database: Database) {
  return createRepository({
    db: database,
    table: primaryEntity,
    primaryKey: 'id',
    createdAtColumn: 'createdAt',
    updatedAtColumn: 'updatedAt',
    deletedAtColumn: 'deletedAt',
  });
}

export function getEntryRepository(database: Database) {
  return createRepository({
    db: database,
    table: entryEntity,
    primaryKey: 'id',
    createdAtColumn: 'createdAt',
    updatedAtColumn: 'updatedAt',
    deletedAtColumn: 'deletedAt',
  });
}

export function getReminderRepository(database: Database) {
  return createRepository({
    db: database,
    table: reminderEntity,
    primaryKey: 'id',
    createdAtColumn: 'createdAt',
    updatedAtColumn: 'updatedAt',
    deletedAtColumn: 'deletedAt',
  });
}

export function getDeviceRepository(database: Database) {
  return createRepository({
    db: database,
    table: deviceEntity,
    primaryKey: 'id',
    createdAtColumn: 'createdAt',
    updatedAtColumn: 'updatedAt',
    deletedAtColumn: 'deletedAt',
  });
}
