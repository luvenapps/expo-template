jest.mock('@/db/sqlite', () => ({
  createRepository: jest.fn((config) => ({
    db: config.db,
    table: config.table,
    primaryKey: config.primaryKey,
    createdAtColumn: config.createdAtColumn,
    updatedAtColumn: config.updatedAtColumn,
    deletedAtColumn: config.deletedAtColumn,
  })),
  primaryEntity: 'primaryEntity',
  entryEntity: 'entryEntity',
  reminderEntity: 'reminderEntity',
  deviceEntity: 'deviceEntity',
}));

import { describe, expect, it } from '@jest/globals';
import {
  getPrimaryEntityRepository,
  getEntryRepository,
  getReminderRepository,
  getDeviceRepository,
} from '@/data/repositories';
import { createRepository } from '@/db/sqlite';

describe('repositories', () => {
  const mockDatabase = {} as any;

  it('creates primary entity repository with correct configuration', () => {
    const repo = getPrimaryEntityRepository(mockDatabase);

    expect(createRepository).toHaveBeenCalledWith({
      db: mockDatabase,
      table: 'primaryEntity',
      primaryKey: 'id',
      createdAtColumn: 'createdAt',
      updatedAtColumn: 'updatedAt',
      deletedAtColumn: 'deletedAt',
    });

    expect(repo).toBeDefined();
  });

  it('creates entry repository with correct configuration', () => {
    const repo = getEntryRepository(mockDatabase);

    expect(createRepository).toHaveBeenCalledWith({
      db: mockDatabase,
      table: 'entryEntity',
      primaryKey: 'id',
      createdAtColumn: 'createdAt',
      updatedAtColumn: 'updatedAt',
      deletedAtColumn: 'deletedAt',
    });

    expect(repo).toBeDefined();
  });

  it('creates reminder repository with correct configuration', () => {
    const repo = getReminderRepository(mockDatabase);

    expect(createRepository).toHaveBeenCalledWith({
      db: mockDatabase,
      table: 'reminderEntity',
      primaryKey: 'id',
      createdAtColumn: 'createdAt',
      updatedAtColumn: 'updatedAt',
      deletedAtColumn: 'deletedAt',
    });

    expect(repo).toBeDefined();
  });

  it('creates device repository with correct configuration', () => {
    const repo = getDeviceRepository(mockDatabase);

    expect(createRepository).toHaveBeenCalledWith({
      db: mockDatabase,
      table: 'deviceEntity',
      primaryKey: 'id',
      createdAtColumn: 'createdAt',
      updatedAtColumn: 'updatedAt',
      deletedAtColumn: 'deletedAt',
    });

    expect(repo).toBeDefined();
  });
});
