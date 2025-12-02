jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

jest.mock('@/db/sqlite', () => ({
  getDb: jest.fn(),
  resetDatabase: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/data/repositories', () => ({
  getPrimaryEntityRepository: jest.fn(),
  getEntryRepository: jest.fn(),
  getReminderRepository: jest.fn(),
  getDeviceRepository: jest.fn(),
}));

jest.mock('@/sync/outbox', () => ({
  enqueueWithDatabase: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'generated-id'),
}));

import { DOMAIN } from '@/config/domain.config';
import { createDeviceLocal, deleteDeviceLocal, updateDeviceLocal } from '@/data/localDevices';
import { createEntryLocal, deleteEntryLocal, updateEntryLocal } from '@/data/localEntries';
import {
  createPrimaryEntityLocal,
  deletePrimaryEntityLocal,
  updatePrimaryEntityLocal,
} from '@/data/localPrimaryEntities';
import {
  createReminderLocal,
  deleteReminderLocal,
  updateReminderLocal,
} from '@/data/localReminders';
import {
  getDeviceRepository,
  getEntryRepository,
  getPrimaryEntityRepository,
  getReminderRepository,
} from '@/data/repositories';
import { getDb } from '@/db/sqlite';
import { enqueueWithDatabase } from '@/sync/outbox';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type Repository<T> = {
  insert: jest.Mock;
  update: jest.Mock;
  findById: jest.Mock;
};

const getDbMock = getDb as jest.Mock;
const enqueueMock = enqueueWithDatabase as jest.Mock;
let mockDb: Record<string, unknown>;

describe('local mutations enqueue outbox records', () => {
  beforeEach(() => {
    enqueueMock.mockReset();
    mockDb = { __db: 'mock' };
    getDbMock.mockResolvedValue(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates primary entity and enqueues insert', async () => {
    const repository = mockPrimaryRepository({
      id: 'primary-1',
      userId: 'user-1',
      name: 'Example',
      cadence: 'daily',
      color: '#000000',
      sortOrder: 0,
      isArchived: false,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      version: 1,
      deletedAt: null,
    });

    (getPrimaryEntityRepository as jest.Mock).mockReturnValue(repository);

    const record = await createPrimaryEntityLocal({
      userId: 'user-1',
      name: 'Example',
      cadence: 'daily',
      color: '#000000',
    });

    expect(repository.insert).toHaveBeenCalled();
    expect(record.id).toBe('primary-1');

    expect(enqueueMock).toHaveBeenCalledWith(mockDb, {
      tableName: DOMAIN.entities.primary.tableName,
      rowId: 'primary-1',
      operation: 'insert',
      payload: expect.objectContaining({
        user_id: 'user-1',
        name: 'Example',
      }),
      version: 1,
    });
  });

  it('updates primary entity and enqueues update', async () => {
    const repository = mockPrimaryRepository(
      {
        id: 'primary-1',
        userId: 'user-1',
        name: 'Example',
        cadence: 'daily',
        color: '#000000',
        sortOrder: 0,
        isArchived: false,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        version: 1,
        deletedAt: null,
      },
      {
        id: 'primary-1',
        userId: 'user-1',
        name: 'Renamed',
        cadence: 'daily',
        color: '#000000',
        sortOrder: 0,
        isArchived: false,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-02T00:00:00.000Z',
        version: 2,
        deletedAt: null,
      },
    );

    (getPrimaryEntityRepository as jest.Mock).mockReturnValue(repository);

    const updated = await updatePrimaryEntityLocal({ id: 'primary-1', name: 'Renamed' });

    expect(repository.update).toHaveBeenCalledWith(
      'primary-1',
      expect.objectContaining({
        name: 'Renamed',
        version: 2,
      }),
    );
    expect(updated.version).toBe(2);
    expect(enqueueMock).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({
        operation: 'update',
        version: 2,
      }),
    );
  });

  it('enqueues delete for primary entity', async () => {
    const repository = mockPrimaryRepository(
      {
        id: 'primary-1',
        userId: 'user-1',
        name: 'Example',
        cadence: 'daily',
        color: '#000000',
        sortOrder: 0,
        isArchived: false,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        version: 1,
        deletedAt: null,
      },
      {
        id: 'primary-1',
        userId: 'user-1',
        name: 'Example',
        cadence: 'daily',
        color: '#000000',
        sortOrder: 0,
        isArchived: false,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-02T00:00:00.000Z',
        version: 2,
        deletedAt: '2025-01-02T00:00:00.000Z',
      },
    );

    (getPrimaryEntityRepository as jest.Mock).mockReturnValue(repository);

    const deleted = await deletePrimaryEntityLocal('primary-1');

    expect(repository.update).toHaveBeenCalledWith(
      'primary-1',
      expect.objectContaining({
        version: 2,
        deletedAt: expect.any(String),
      }),
    );
    expect(deleted?.deletedAt).toBeDefined();
    expect(enqueueMock).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({
        operation: 'delete',
        version: 2,
      }),
    );
  });

  it('creates entry and enqueues insert', async () => {
    const repository = mockEntryRepository({
      id: 'entry-1',
      userId: 'user-1',
      [DOMAIN.entities.entries.foreignKey]: 'primary-1',
      date: '2025-01-02',
      amount: 1,
      source: 'local',
      createdAt: '2025-01-02T00:00:00.000Z',
      updatedAt: '2025-01-02T00:00:00.000Z',
      version: 1,
      deletedAt: null,
    });

    (getEntryRepository as jest.Mock).mockReturnValue(repository);

    await createEntryLocal({
      userId: 'user-1',
      [DOMAIN.entities.entries.foreignKey]: 'primary-1',
      date: '2025-01-02',
    } as any);

    expect(enqueueMock).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({
        tableName: DOMAIN.entities.entries.tableName,
        operation: 'insert',
      }),
    );
  });

  it('creates reminder and enqueues insert', async () => {
    const repository = mockReminderRepository({
      id: 'reminder-1',
      userId: 'user-1',
      [DOMAIN.entities.reminders.foreignKey]: 'primary-1',
      timeLocal: '09:00',
      daysOfWeek: '1,2,3',
      timezone: 'UTC',
      isEnabled: true,
      createdAt: '2025-01-02T00:00:00.000Z',
      updatedAt: '2025-01-02T00:00:00.000Z',
      version: 1,
      deletedAt: null,
    });

    (getReminderRepository as jest.Mock).mockReturnValue(repository);

    await createReminderLocal({
      userId: 'user-1',
      [DOMAIN.entities.reminders.foreignKey]: 'primary-1',
      timeLocal: '09:00',
      daysOfWeek: '1,2,3',
    } as any);

    expect(enqueueMock).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({
        tableName: DOMAIN.entities.reminders.tableName,
        operation: 'insert',
      }),
    );
  });

  it('creates device and enqueues insert', async () => {
    const repository = mockDeviceRepository({
      id: 'device-1',
      userId: 'user-1',
      platform: 'ios',
      lastSyncAt: null,
      createdAt: '2025-01-02T00:00:00.000Z',
      updatedAt: '2025-01-02T00:00:00.000Z',
      version: 1,
      deletedAt: null,
    });

    (getDeviceRepository as jest.Mock).mockReturnValue(repository);

    await createDeviceLocal({ userId: 'user-1', platform: 'ios' });

    expect(enqueueMock).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({
        tableName: DOMAIN.entities.devices.tableName,
        operation: 'insert',
      }),
    );
  });
});

describe('error handling and edge cases', () => {
  beforeEach(() => {
    enqueueMock.mockReset();
    mockDb = { __db: 'mock' };
    getDbMock.mockResolvedValue(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('throws error when creating primary entity on web platform', async () => {
    const originalPlatform = require('react-native').Platform.OS;
    require('react-native').Platform.OS = 'web';

    await expect(
      createPrimaryEntityLocal({
        userId: 'user-1',
        name: 'Test',
        cadence: 'daily',
        color: '#000000',
      }),
    ).rejects.toThrow('Local SQLite mutations are not supported on web');

    require('react-native').Platform.OS = originalPlatform;
  });

  it('validates primary entity name before touching the database', async () => {
    await expect(
      createPrimaryEntityLocal({
        userId: 'user-1',
        name: '   ',
        cadence: 'daily',
        color: '#000000',
      }),
    ).rejects.toThrow('Name is required');

    expect(getDbMock).not.toHaveBeenCalled();
  });

  it('validates entry date format', async () => {
    await expect(
      createEntryLocal({
        userId: 'user-1',
        [DOMAIN.entities.entries.foreignKey]: 'primary-1',
        date: '2025/01/01',
      } as any),
    ).rejects.toThrow('Date must be in YYYY-MM-DD format');

    expect(getDbMock).not.toHaveBeenCalled();
  });

  it('validates reminder time of day', async () => {
    await expect(
      createReminderLocal({
        userId: 'user-1',
        [DOMAIN.entities.reminders.foreignKey]: 'primary-1',
        timeLocal: '25:00',
        daysOfWeek: '1,2,3',
      } as any),
    ).rejects.toThrow('Reminder time must use HH:MM (24-hour) format');

    expect(getDbMock).not.toHaveBeenCalled();
  });

  it('validates device last_sync timestamp', async () => {
    await expect(
      createDeviceLocal({
        userId: 'user-1',
        platform: 'ios',
        lastSyncAt: 'not-a-date',
      }),
    ).rejects.toThrow('Last sync time must be a valid ISO 8601 timestamp');

    expect(getDbMock).not.toHaveBeenCalled();
  });

  it('throws error when primary entity not found after insert', async () => {
    const repository = {
      insert: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(null), // Simulates record not found
    };

    (getPrimaryEntityRepository as jest.Mock).mockReturnValue(repository);

    await expect(
      createPrimaryEntityLocal({
        userId: 'user-1',
        name: 'Test',
        cadence: 'daily',
        color: '#000000',
      }),
    ).rejects.toThrow('Failed to create');
  });

  it('throws error when updating non-existent primary entity', async () => {
    const repository = {
      insert: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(null), // Record doesn't exist
    };

    (getPrimaryEntityRepository as jest.Mock).mockReturnValue(repository);

    await expect(
      updatePrimaryEntityLocal({
        id: 'non-existent',
        name: 'Updated',
      }),
    ).rejects.toThrow('not found');
  });

  it('throws error when primary entity missing after update', async () => {
    const repository = {
      insert: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      findById: jest
        .fn()
        .mockResolvedValueOnce({ id: 'primary-1', version: 1 }) // Exists initially
        .mockResolvedValueOnce(null), // Missing after update
    };

    (getPrimaryEntityRepository as jest.Mock).mockReturnValue(repository);

    await expect(
      updatePrimaryEntityLocal({
        id: 'primary-1',
        name: 'Updated',
      }),
    ).rejects.toThrow('missing after update');
  });

  it('returns null when deleting non-existent primary entity', async () => {
    const repository = {
      insert: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(null), // Doesn't exist
    };

    (getPrimaryEntityRepository as jest.Mock).mockReturnValue(repository);

    const result = await deletePrimaryEntityLocal('non-existent');
    expect(result).toBeNull();
  });

  it('returns null when entity missing after soft delete', async () => {
    const repository = {
      insert: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      findById: jest
        .fn()
        .mockResolvedValueOnce({ id: 'primary-1', version: 1 }) // Exists initially
        .mockResolvedValueOnce(null), // Missing after delete
    };

    (getPrimaryEntityRepository as jest.Mock).mockReturnValue(repository);

    const result = await deletePrimaryEntityLocal('primary-1');
    expect(result).toBeNull();
  });

  it('creates entry with custom id', async () => {
    const repository = mockEntryRepository({
      id: 'custom-id',
      userId: 'user-1',
      [DOMAIN.entities.entries.foreignKey]: 'primary-1',
      date: '2025-01-01',
      amount: 1,
      source: 'user',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      version: 1,
      deletedAt: null,
    });

    (getEntryRepository as jest.Mock).mockReturnValue(repository);

    const result = await createEntryLocal({
      id: 'custom-id',
      userId: 'user-1',
      [DOMAIN.entities.entries.foreignKey]: 'primary-1',
      date: '2025-01-01',
      amount: 1,
      source: 'user',
    });

    expect(result.id).toBe('custom-id');
  });

  it('creates device with optional lastSyncAt', async () => {
    const repository = mockDeviceRepository({
      id: 'device-1',
      userId: 'user-1',
      platform: 'ios',
      lastSyncAt: '2025-01-01T00:00:00.000Z',
      version: 1,
      deletedAt: null,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    });

    (getDeviceRepository as jest.Mock).mockReturnValue(repository);

    const result = await createDeviceLocal({
      userId: 'user-1',
      platform: 'ios',
      lastSyncAt: '2025-01-01T00:00:00.000Z',
    });

    expect(result.lastSyncAt).toBe('2025-01-01T00:00:00.000Z');
  });

  it('creates primary entity with optional fields', async () => {
    const repository = mockPrimaryRepository({
      id: 'primary-1',
      userId: 'user-1',
      name: 'Test',
      cadence: 'weekly',
      color: '#ff0000',
      sortOrder: 5,
      isArchived: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      version: 1,
      deletedAt: null,
    });

    (getPrimaryEntityRepository as jest.Mock).mockReturnValue(repository);

    const result = await createPrimaryEntityLocal({
      userId: 'user-1',
      name: 'Test',
      cadence: 'weekly',
      color: '#ff0000',
      sortOrder: 5,
      isArchived: true,
    });

    expect(result.sortOrder).toBe(5);
    expect(result.isArchived).toBe(true);
  });

  it('creates primary entity using provided database without calling getDb', async () => {
    const repository = mockPrimaryRepository({
      id: 'primary-1',
      userId: 'user-1',
      name: 'Test',
      cadence: 'daily',
      color: '#000000',
      sortOrder: 0,
      isArchived: false,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      version: 1,
      deletedAt: null,
    });

    (getPrimaryEntityRepository as jest.Mock).mockReturnValue(repository);

    const customDb = { __db: 'custom' };

    await createPrimaryEntityLocal(
      {
        userId: 'user-1',
        name: 'Test',
        cadence: 'daily',
        color: '#000000',
      },
      { database: customDb as any },
    );

    expect(getDbMock).not.toHaveBeenCalled();
    expect(enqueueMock).toHaveBeenCalledWith(
      customDb,
      expect.objectContaining({
        operation: 'insert',
        tableName: DOMAIN.entities.primary.tableName,
      }),
    );
  });

  it('updates primary entity with only name', async () => {
    const existing = {
      id: 'primary-1',
      userId: 'user-1',
      name: 'Old Name',
      cadence: 'daily',
      color: '#000000',
      version: 1,
    };

    const updated = {
      ...existing,
      name: 'New Name',
      version: 2,
    };

    const repository = mockPrimaryRepository(existing, updated);
    (getPrimaryEntityRepository as jest.Mock).mockReturnValue(repository);

    const result = await updatePrimaryEntityLocal({
      id: 'primary-1',
      name: 'New Name',
    });

    expect(result.name).toBe('New Name');
    expect(repository.update).toHaveBeenCalledWith(
      'primary-1',
      expect.objectContaining({ name: 'New Name', version: 2 }),
    );
  });

  it('updates primary entity with deletedAt still uses update operation', async () => {
    const existing = {
      id: 'primary-1',
      userId: 'user-1',
      name: 'Test',
      cadence: 'daily',
      color: '#000000',
      version: 1,
      deletedAt: null,
    };

    const updated = {
      ...existing,
      version: 2,
      deletedAt: '2025-01-01T00:00:00.000Z',
    };

    const repository = mockPrimaryRepository(existing, updated);
    (getPrimaryEntityRepository as jest.Mock).mockReturnValue(repository);

    await updatePrimaryEntityLocal({
      id: 'primary-1',
      deletedAt: '2025-01-01T00:00:00.000Z',
    });

    // Primary entities always use 'update' operation, even when setting deletedAt
    // Use deletePrimaryEntityLocal() for proper soft deletes
    expect(enqueueMock).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({
        operation: 'update',
        payload: expect.objectContaining({
          deleted_at: '2025-01-01T00:00:00.000Z',
        }),
      }),
    );
  });

  it('creates entry without optional amount (defaults to 0)', async () => {
    const repository = mockEntryRepository({
      id: 'entry-1',
      userId: 'user-1',
      [DOMAIN.entities.entries.foreignKey]: 'primary-1',
      date: '2025-01-01',
      amount: 0,
      source: 'local',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      version: 1,
      deletedAt: null,
    });

    (getEntryRepository as jest.Mock).mockReturnValue(repository);

    await createEntryLocal({
      userId: 'user-1',
      [DOMAIN.entities.entries.foreignKey]: 'primary-1',
      date: '2025-01-01',
      source: 'user',
    });

    expect(repository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 0,
      }),
    );
  });

  it('creates entry without optional source (defaults to local)', async () => {
    const repository = mockEntryRepository({
      id: 'entry-1',
      userId: 'user-1',
      [DOMAIN.entities.entries.foreignKey]: 'primary-1',
      date: '2025-01-01',
      amount: 1,
      source: 'local',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      version: 1,
      deletedAt: null,
    });

    (getEntryRepository as jest.Mock).mockReturnValue(repository);

    await createEntryLocal({
      userId: 'user-1',
      [DOMAIN.entities.entries.foreignKey]: 'primary-1',
      date: '2025-01-01',
      amount: 1,
    });

    expect(repository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'local',
      }),
    );
  });

  it('throws error when creating entry on web platform', async () => {
    const originalPlatform = require('react-native').Platform.OS;
    require('react-native').Platform.OS = 'web';

    await expect(
      createEntryLocal({
        userId: 'user-1',
        [DOMAIN.entities.entries.foreignKey]: 'primary-1',
        date: '2025-01-01',
        amount: 1,
        source: 'user',
      }),
    ).rejects.toThrow('Local SQLite mutations are not supported on web');

    require('react-native').Platform.OS = originalPlatform;
  });

  it('throws error when creating reminder on web platform', async () => {
    const originalPlatform = require('react-native').Platform.OS;
    require('react-native').Platform.OS = 'web';

    await expect(
      createReminderLocal({
        userId: 'user-1',
        [DOMAIN.entities.reminders.foreignKey]: 'primary-1',
        timeLocal: '09:00',
        daysOfWeek: '1,2,3',
        timezone: 'UTC',
        isEnabled: true,
      }),
    ).rejects.toThrow('Local SQLite mutations are not supported on web');

    require('react-native').Platform.OS = originalPlatform;
  });

  it('throws error when creating device on web platform', async () => {
    const originalPlatform = require('react-native').Platform.OS;
    require('react-native').Platform.OS = 'web';

    await expect(
      createDeviceLocal({
        userId: 'user-1',
        platform: 'ios',
      }),
    ).rejects.toThrow('Local SQLite mutations are not supported on web');

    require('react-native').Platform.OS = originalPlatform;
  });

  it('creates device without optional lastSyncAt (defaults to null)', async () => {
    const repository = mockDeviceRepository({
      id: 'device-1',
      userId: 'user-1',
      platform: 'ios',
      lastSyncAt: null,
      version: 1,
      deletedAt: null,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    });

    (getDeviceRepository as jest.Mock).mockReturnValue(repository);

    const result = await createDeviceLocal({
      userId: 'user-1',
      platform: 'ios',
    });

    expect(result.lastSyncAt).toBeNull();
  });

  it('updates entry successfully', async () => {
    const existing = {
      id: 'entry-1',
      userId: 'user-1',
      [DOMAIN.entities.entries.foreignKey]: 'primary-1',
      date: '2025-01-01',
      amount: 1,
      source: 'local',
      version: 1,
    };

    const updated = {
      ...existing,
      amount: 2,
      version: 2,
    };

    const repository = {
      insert: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValueOnce(existing).mockResolvedValue(updated),
    };

    (getEntryRepository as jest.Mock).mockReturnValue(repository);

    const result = await updateEntryLocal({
      id: 'entry-1',
      amount: 2,
    });

    expect(result.amount).toBe(2);
    expect(repository.update).toHaveBeenCalled();
  });

  it('updates reminder successfully', async () => {
    const existing = {
      id: 'reminder-1',
      userId: 'user-1',
      [DOMAIN.entities.reminders.foreignKey]: 'primary-1',
      timeLocal: '09:00',
      daysOfWeek: '1,2,3',
      timezone: 'UTC',
      isEnabled: true,
      version: 1,
    };

    const updated = {
      ...existing,
      timeLocal: '10:00',
      version: 2,
    };

    const repository = {
      insert: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValueOnce(existing).mockResolvedValue(updated),
    };

    (getReminderRepository as jest.Mock).mockReturnValue(repository);

    const result = await updateReminderLocal({
      id: 'reminder-1',
      timeLocal: '10:00',
    });

    expect(result.timeLocal).toBe('10:00');
    expect(repository.update).toHaveBeenCalled();
  });

  it('updates device successfully', async () => {
    const existing = {
      id: 'device-1',
      userId: 'user-1',
      platform: 'ios',
      lastSyncAt: null,
      version: 1,
    };

    const updated = {
      ...existing,
      platform: 'android',
      version: 2,
    };

    const repository = {
      insert: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValueOnce(existing).mockResolvedValue(updated),
    };

    (getDeviceRepository as jest.Mock).mockReturnValue(repository);

    const result = await updateDeviceLocal({
      id: 'device-1',
      platform: 'android',
    });

    expect(result.platform).toBe('android');
    expect(repository.update).toHaveBeenCalled();
  });

  it('deletes entry successfully', async () => {
    const existing = {
      id: 'entry-1',
      userId: 'user-1',
      [DOMAIN.entities.entries.foreignKey]: 'primary-1',
      date: '2025-01-01',
      amount: 1,
      source: 'local',
      version: 1,
      deletedAt: null,
    };

    const deleted = {
      ...existing,
      version: 2,
      deletedAt: '2025-01-01T00:00:00.000Z',
    };

    const repository = {
      insert: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValueOnce(existing).mockResolvedValue(deleted),
    };

    (getEntryRepository as jest.Mock).mockReturnValue(repository);

    const result = await deleteEntryLocal('entry-1');

    expect(result?.deletedAt).toBeTruthy();
    expect(repository.update).toHaveBeenCalled();
  });

  it('deletes reminder successfully', async () => {
    const existing = {
      id: 'reminder-1',
      userId: 'user-1',
      [DOMAIN.entities.reminders.foreignKey]: 'primary-1',
      timeLocal: '09:00',
      version: 1,
      deletedAt: null,
    };

    const deleted = {
      ...existing,
      version: 2,
      deletedAt: '2025-01-01T00:00:00.000Z',
    };

    const repository = {
      insert: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValueOnce(existing).mockResolvedValue(deleted),
    };

    (getReminderRepository as jest.Mock).mockReturnValue(repository);

    const result = await deleteReminderLocal('reminder-1');

    expect(result?.deletedAt).toBeTruthy();
    expect(repository.update).toHaveBeenCalled();
  });

  it('deletes device successfully', async () => {
    const existing = {
      id: 'device-1',
      userId: 'user-1',
      platform: 'ios',
      version: 1,
      deletedAt: null,
    };

    const deleted = {
      ...existing,
      version: 2,
      deletedAt: '2025-01-01T00:00:00.000Z',
    };

    const repository = {
      insert: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValueOnce(existing).mockResolvedValue(deleted),
    };

    (getDeviceRepository as jest.Mock).mockReturnValue(repository);

    const result = await deleteDeviceLocal('device-1');

    expect(result?.deletedAt).toBeTruthy();
    expect(repository.update).toHaveBeenCalled();
  });

  it('throws error when updating non-existent device', async () => {
    const repository = {
      insert: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(null),
    };

    (getDeviceRepository as jest.Mock).mockReturnValue(repository);

    await expect(
      updateDeviceLocal({
        id: 'non-existent',
        platform: 'android',
      }),
    ).rejects.toThrow('Device non-existent not found');
  });

  it('throws error when device missing after update', async () => {
    const existing = {
      id: 'device-1',
      userId: 'user-1',
      platform: 'ios',
      version: 1,
    };

    const repository = {
      insert: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValueOnce(existing).mockResolvedValue(null),
    };

    (getDeviceRepository as jest.Mock).mockReturnValue(repository);

    await expect(
      updateDeviceLocal({
        id: 'device-1',
        platform: 'android',
      }),
    ).rejects.toThrow('Device device-1 missing after update');
  });

  it('throws error when creating device fails', async () => {
    const repository = {
      insert: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(null),
    };

    (getDeviceRepository as jest.Mock).mockReturnValue(repository);

    await expect(
      createDeviceLocal({
        userId: 'user-1',
        platform: 'ios',
      }),
    ).rejects.toThrow('Failed to create device record');
  });

  it('returns null when deleting non-existent device', async () => {
    const repository = {
      insert: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(null),
    };

    (getDeviceRepository as jest.Mock).mockReturnValue(repository);

    const result = await deleteDeviceLocal('non-existent');
    expect(result).toBeNull();
  });

  it('returns null when device missing after delete', async () => {
    const existing = {
      id: 'device-1',
      userId: 'user-1',
      platform: 'ios',
      version: 1,
    };

    const repository = {
      insert: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValueOnce(existing).mockResolvedValue(null),
    };

    (getDeviceRepository as jest.Mock).mockReturnValue(repository);

    const result = await deleteDeviceLocal('device-1');
    expect(result).toBeNull();
  });

  it('throws error when updating non-existent reminder', async () => {
    const repository = {
      insert: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(null),
    };

    (getReminderRepository as jest.Mock).mockReturnValue(repository);

    await expect(
      updateReminderLocal({
        id: 'non-existent',
        timeLocal: '10:00',
      }),
    ).rejects.toThrow('Reminder non-existent not found');
  });

  it('throws error when reminder missing after update', async () => {
    const existing = {
      id: 'reminder-1',
      userId: 'user-1',
      [DOMAIN.entities.reminders.foreignKey]: 'primary-1',
      timeLocal: '09:00',
      version: 1,
    };

    const repository = {
      insert: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValueOnce(existing).mockResolvedValue(null),
    };

    (getReminderRepository as jest.Mock).mockReturnValue(repository);

    await expect(
      updateReminderLocal({
        id: 'reminder-1',
        timeLocal: '10:00',
      }),
    ).rejects.toThrow('Reminder reminder-1 missing after update');
  });

  it('throws error when creating reminder fails', async () => {
    const repository = {
      insert: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(null),
    };

    (getReminderRepository as jest.Mock).mockReturnValue(repository);

    await expect(
      createReminderLocal({
        userId: 'user-1',
        [DOMAIN.entities.reminders.foreignKey]: 'primary-1',
        timeLocal: '09:00',
        daysOfWeek: '1,2,3',
      }),
    ).rejects.toThrow('Failed to create reminder');
  });

  it('returns null when deleting non-existent reminder', async () => {
    const repository = {
      insert: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(null),
    };

    (getReminderRepository as jest.Mock).mockReturnValue(repository);

    const result = await deleteReminderLocal('non-existent');
    expect(result).toBeNull();
  });

  it('returns null when reminder missing after delete', async () => {
    const existing = {
      id: 'reminder-1',
      userId: 'user-1',
      [DOMAIN.entities.reminders.foreignKey]: 'primary-1',
      timeLocal: '09:00',
      version: 1,
    };

    const repository = {
      insert: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValueOnce(existing).mockResolvedValue(null),
    };

    (getReminderRepository as jest.Mock).mockReturnValue(repository);

    const result = await deleteReminderLocal('reminder-1');
    expect(result).toBeNull();
  });

  it('creates reminder with default timezone (UTC)', async () => {
    const repository = mockReminderRepository({
      id: 'reminder-1',
      userId: 'user-1',
      [DOMAIN.entities.reminders.foreignKey]: 'primary-1',
      timeLocal: '09:00',
      daysOfWeek: '1,2,3',
      timezone: 'UTC',
      isEnabled: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      version: 1,
      deletedAt: null,
    });

    (getReminderRepository as jest.Mock).mockReturnValue(repository);

    const result = await createReminderLocal({
      userId: 'user-1',
      [DOMAIN.entities.reminders.foreignKey]: 'primary-1',
      timeLocal: '09:00',
      daysOfWeek: '1,2,3',
    });

    expect(result.timezone).toBe('UTC');
    expect(repository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        timezone: 'UTC',
      }),
    );
  });

  it('creates reminder with default isEnabled (true)', async () => {
    const repository = mockReminderRepository({
      id: 'reminder-1',
      userId: 'user-1',
      [DOMAIN.entities.reminders.foreignKey]: 'primary-1',
      timeLocal: '09:00',
      daysOfWeek: '1,2,3',
      timezone: 'UTC',
      isEnabled: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      version: 1,
      deletedAt: null,
    });

    (getReminderRepository as jest.Mock).mockReturnValue(repository);

    const result = await createReminderLocal({
      userId: 'user-1',
      [DOMAIN.entities.reminders.foreignKey]: 'primary-1',
      timeLocal: '09:00',
      daysOfWeek: '1,2,3',
    });

    expect(result.isEnabled).toBe(true);
    expect(repository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        isEnabled: true,
      }),
    );
  });

  it('updates device with deletedAt triggering delete operation', async () => {
    const existing = {
      id: 'device-1',
      userId: 'user-1',
      platform: 'ios',
      version: 1,
      deletedAt: null,
    };

    const updated = {
      ...existing,
      version: 2,
      deletedAt: '2025-01-01T00:00:00.000Z',
    };

    const repository = {
      insert: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValueOnce(existing).mockResolvedValue(updated),
    };

    (getDeviceRepository as jest.Mock).mockReturnValue(repository);

    await updateDeviceLocal({
      id: 'device-1',
      deletedAt: '2025-01-01T00:00:00.000Z',
    });

    expect(enqueueMock).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({
        operation: 'delete',
      }),
    );
  });

  it('updates device with lastSyncAt', async () => {
    const existing = {
      id: 'device-1',
      userId: 'user-1',
      platform: 'ios',
      lastSyncAt: null,
      version: 1,
    };

    const updated = {
      ...existing,
      lastSyncAt: '2025-01-01T00:00:00.000Z',
      version: 2,
    };

    const repository = {
      insert: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValueOnce(existing).mockResolvedValue(updated),
    };

    (getDeviceRepository as jest.Mock).mockReturnValue(repository);

    const result = await updateDeviceLocal({
      id: 'device-1',
      lastSyncAt: '2025-01-01T00:00:00.000Z',
    });

    expect(result.lastSyncAt).toBe('2025-01-01T00:00:00.000Z');
    expect(repository.update).toHaveBeenCalledWith(
      'device-1',
      expect.objectContaining({
        lastSyncAt: '2025-01-01T00:00:00.000Z',
        version: 2,
      }),
    );
  });

  it('updates reminder with all fields', async () => {
    const existing = {
      id: 'reminder-1',
      userId: 'user-1',
      [DOMAIN.entities.reminders.foreignKey]: 'primary-1',
      timeLocal: '09:00',
      daysOfWeek: '1,2,3',
      timezone: 'UTC',
      isEnabled: true,
      version: 1,
    };

    const updated = {
      ...existing,
      [DOMAIN.entities.reminders.foreignKey]: 'primary-2',
      timeLocal: '10:00',
      daysOfWeek: '4,5,6',
      timezone: 'America/New_York',
      isEnabled: false,
      version: 2,
    };

    const repository = {
      insert: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValueOnce(existing).mockResolvedValue(updated),
    };

    (getReminderRepository as jest.Mock).mockReturnValue(repository);

    const result = await updateReminderLocal({
      id: 'reminder-1',
      [DOMAIN.entities.reminders.foreignKey]: 'primary-2',
      timeLocal: '10:00',
      daysOfWeek: '4,5,6',
      timezone: 'America/New_York',
      isEnabled: false,
    });

    expect(result.timeLocal).toBe('10:00');
    expect(result.daysOfWeek).toBe('4,5,6');
    expect(result.timezone).toBe('America/New_York');
    expect(result.isEnabled).toBe(false);
    expect(repository.update).toHaveBeenCalledWith(
      'reminder-1',
      expect.objectContaining({
        timeLocal: '10:00',
        daysOfWeek: '4,5,6',
        timezone: 'America/New_York',
        isEnabled: false,
        version: 2,
      }),
    );
  });

  it('creates device with custom id', async () => {
    const repository = mockDeviceRepository({
      id: 'custom-device-id',
      userId: 'user-1',
      platform: 'ios',
      lastSyncAt: null,
      version: 1,
      deletedAt: null,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    });

    (getDeviceRepository as jest.Mock).mockReturnValue(repository);

    const result = await createDeviceLocal({
      id: 'custom-device-id',
      userId: 'user-1',
      platform: 'ios',
    });

    expect(result.id).toBe('custom-device-id');
  });

  it('creates reminder with custom id', async () => {
    const repository = mockReminderRepository({
      id: 'custom-reminder-id',
      userId: 'user-1',
      [DOMAIN.entities.reminders.foreignKey]: 'primary-1',
      timeLocal: '09:00',
      daysOfWeek: '1,2,3',
      timezone: 'UTC',
      isEnabled: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      version: 1,
      deletedAt: null,
    });

    (getReminderRepository as jest.Mock).mockReturnValue(repository);

    const result = await createReminderLocal({
      id: 'custom-reminder-id',
      userId: 'user-1',
      [DOMAIN.entities.reminders.foreignKey]: 'primary-1',
      timeLocal: '09:00',
      daysOfWeek: '1,2,3',
    });

    expect(result.id).toBe('custom-reminder-id');
  });

  it('throws error when creating entry fails', async () => {
    const repository = {
      insert: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(null),
    };

    (getEntryRepository as jest.Mock).mockReturnValue(repository);

    await expect(
      createEntryLocal({
        userId: 'user-1',
        [DOMAIN.entities.entries.foreignKey]: 'primary-1',
        date: '2025-01-01',
        amount: 1,
        source: 'user',
      }),
    ).rejects.toThrow('Failed to create entry');
  });

  it('throws error when updating non-existent entry', async () => {
    const repository = {
      insert: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(null),
    };

    (getEntryRepository as jest.Mock).mockReturnValue(repository);

    await expect(
      updateEntryLocal({
        id: 'non-existent',
        amount: 2,
      }),
    ).rejects.toThrow('Entry non-existent not found');
  });

  it('updates entry with foreign key', async () => {
    const existing = {
      id: 'entry-1',
      userId: 'user-1',
      [DOMAIN.entities.entries.foreignKey]: 'primary-1',
      date: '2025-01-01',
      amount: 1,
      source: 'local',
      version: 1,
    };

    const updated = {
      ...existing,
      [DOMAIN.entities.entries.foreignKey]: 'primary-2',
      version: 2,
    };

    const repository = {
      insert: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValueOnce(existing).mockResolvedValue(updated),
    };

    (getEntryRepository as jest.Mock).mockReturnValue(repository);

    const result = await updateEntryLocal({
      id: 'entry-1',
      [DOMAIN.entities.entries.foreignKey]: 'primary-2',
    });

    expect(result[DOMAIN.entities.entries.foreignKey]).toBe('primary-2');
    expect(repository.update).toHaveBeenCalledWith(
      'entry-1',
      expect.objectContaining({
        [DOMAIN.entities.entries.foreignKey]: 'primary-2',
        version: 2,
      }),
    );
  });

  it('throws error when entry missing after update', async () => {
    const existing = {
      id: 'entry-1',
      userId: 'user-1',
      [DOMAIN.entities.entries.foreignKey]: 'primary-1',
      date: '2025-01-01',
      amount: 1,
      source: 'local',
      version: 1,
    };

    const repository = {
      insert: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValueOnce(existing).mockResolvedValue(null),
    };

    (getEntryRepository as jest.Mock).mockReturnValue(repository);

    await expect(
      updateEntryLocal({
        id: 'entry-1',
        amount: 2,
      }),
    ).rejects.toThrow('Entry entry-1 missing after update');
  });

  it('returns null when deleting non-existent entry', async () => {
    const repository = {
      insert: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(null),
    };

    (getEntryRepository as jest.Mock).mockReturnValue(repository);

    const result = await deleteEntryLocal('non-existent');
    expect(result).toBeNull();
  });

  it('returns null when entry missing after delete', async () => {
    const existing = {
      id: 'entry-1',
      userId: 'user-1',
      [DOMAIN.entities.entries.foreignKey]: 'primary-1',
      date: '2025-01-01',
      amount: 1,
      source: 'local',
      version: 1,
    };

    const repository = {
      insert: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValueOnce(existing).mockResolvedValue(null),
    };

    (getEntryRepository as jest.Mock).mockReturnValue(repository);

    const result = await deleteEntryLocal('entry-1');
    expect(result).toBeNull();
  });

  it('updates entry with date, amount, and source', async () => {
    const existing = {
      id: 'entry-1',
      userId: 'user-1',
      [DOMAIN.entities.entries.foreignKey]: 'primary-1',
      date: '2025-01-01',
      amount: 1,
      source: 'local',
      version: 1,
    };

    const updated = {
      ...existing,
      date: '2025-01-02',
      amount: 3,
      source: 'manual',
      version: 2,
    };

    const repository = {
      insert: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValueOnce(existing).mockResolvedValue(updated),
    };

    (getEntryRepository as jest.Mock).mockReturnValue(repository);

    const result = await updateEntryLocal({
      id: 'entry-1',
      date: '2025-01-02',
      amount: 3,
      source: 'manual',
    });

    expect(result.date).toBe('2025-01-02');
    expect(result.amount).toBe(3);
    expect(result.source).toBe('manual');
    expect(repository.update).toHaveBeenCalledWith(
      'entry-1',
      expect.objectContaining({
        date: '2025-01-02',
        amount: 3,
        source: 'manual',
        version: 2,
      }),
    );
  });

  it('updates entry with deletedAt', async () => {
    const existing = {
      id: 'entry-1',
      userId: 'user-1',
      [DOMAIN.entities.entries.foreignKey]: 'primary-1',
      date: '2025-01-01',
      amount: 1,
      source: 'local',
      version: 1,
      deletedAt: null,
    };

    const updated = {
      ...existing,
      deletedAt: '2025-01-02T00:00:00.000Z',
      version: 2,
    };

    const repository = {
      insert: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValueOnce(existing).mockResolvedValue(updated),
    };

    (getEntryRepository as jest.Mock).mockReturnValue(repository);

    const result = await updateEntryLocal({
      id: 'entry-1',
      deletedAt: '2025-01-02T00:00:00.000Z',
    });

    expect(result.deletedAt).toBe('2025-01-02T00:00:00.000Z');
    expect(repository.update).toHaveBeenCalledWith(
      'entry-1',
      expect.objectContaining({
        deletedAt: '2025-01-02T00:00:00.000Z',
        version: 2,
      }),
    );
  });

  it('creates reminder using provided database without calling getDb', async () => {
    const repository = mockReminderRepository({
      id: 'reminder-1',
      userId: 'user-1',
      [DOMAIN.entities.reminders.foreignKey]: 'primary-1',
      timeLocal: '09:00',
      daysOfWeek: '1,2,3',
      timezone: 'America/New_York',
      isEnabled: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      version: 1,
      deletedAt: null,
    });

    (getReminderRepository as jest.Mock).mockReturnValue(repository);

    const customDb = { __db: 'custom' };

    await createReminderLocal(
      {
        userId: 'user-1',
        [DOMAIN.entities.reminders.foreignKey]: 'primary-1',
        timeLocal: '09:00',
        daysOfWeek: '1,2,3',
        timezone: 'America/New_York',
        isEnabled: true,
      },
      { database: customDb as any },
    );

    expect(getDbMock).not.toHaveBeenCalled();
    expect(enqueueMock).toHaveBeenCalledWith(
      customDb,
      expect.objectContaining({
        operation: 'insert',
        tableName: DOMAIN.entities.reminders.tableName,
      }),
    );
  });

  it('creates device using provided database without calling getDb', async () => {
    const repository = mockDeviceRepository({
      id: 'device-1',
      userId: 'user-1',
      platform: 'ios',
      pushToken: null,
      lastSyncAt: null,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      version: 1,
      deletedAt: null,
    });

    (getDeviceRepository as jest.Mock).mockReturnValue(repository);

    const customDb = { __db: 'custom' };

    await createDeviceLocal(
      {
        userId: 'user-1',
        platform: 'ios',
      },
      { database: customDb as any },
    );

    expect(getDbMock).not.toHaveBeenCalled();
    expect(enqueueMock).toHaveBeenCalledWith(
      customDb,
      expect.objectContaining({
        operation: 'insert',
        tableName: DOMAIN.entities.devices.tableName,
      }),
    );
  });

  it('creates entry using provided database without calling getDb', async () => {
    const repository = mockEntryRepository({
      id: 'entry-1',
      userId: 'user-1',
      [DOMAIN.entities.entries.foreignKey]: 'primary-1',
      date: '2025-01-01',
      amount: 1,
      source: 'local',
      version: 1,
      deletedAt: null,
    });

    (getEntryRepository as jest.Mock).mockReturnValue(repository);

    const customDb = { __db: 'custom' };

    await createEntryLocal(
      {
        userId: 'user-1',
        [DOMAIN.entities.entries.foreignKey]: 'primary-1',
        date: '2025-01-01',
      },
      { database: customDb as any },
    );

    expect(getDbMock).not.toHaveBeenCalled();
    expect(enqueueMock).toHaveBeenCalledWith(
      customDb,
      expect.objectContaining({
        operation: 'insert',
        tableName: DOMAIN.entities.entries.tableName,
      }),
    );
  });

  it('validates timezone when explicitly provided on create', async () => {
    await expect(
      createReminderLocal({
        userId: 'user-1',
        [DOMAIN.entities.reminders.foreignKey]: 'primary-1',
        timeLocal: '09:00',
        daysOfWeek: '1,2,3',
        timezone: '',
        isEnabled: true,
      }),
    ).rejects.toThrow('Timezone is required');

    expect(getDbMock).not.toHaveBeenCalled();
  });

  it('validates deletedAt format when updating reminder', async () => {
    await expect(
      updateReminderLocal({
        id: 'reminder-1',
        deletedAt: 'invalid-date',
      }),
    ).rejects.toThrow('Deleted at must be a valid ISO 8601 timestamp');

    expect(getDbMock).not.toHaveBeenCalled();
  });

  it('validates color format when updating primary entity', async () => {
    await expect(
      updatePrimaryEntityLocal({
        id: 'primary-1',
        color: 'not-a-hex-color',
      }),
    ).rejects.toThrow('Color must be a valid hex code');

    expect(getDbMock).not.toHaveBeenCalled();
  });

  it('validates cadence when updating primary entity', async () => {
    await expect(
      updatePrimaryEntityLocal({
        id: 'primary-1',
        cadence: 'invalid-cadence',
      }),
    ).rejects.toThrow('Cadence must be one of: daily, weekly, monthly');

    expect(getDbMock).not.toHaveBeenCalled();
  });

  it('validates sortOrder range when updating primary entity', async () => {
    await expect(
      updatePrimaryEntityLocal({
        id: 'primary-1',
        sortOrder: 99999,
      }),
    ).rejects.toThrow('Sort order must be between 0 and 10000');

    expect(getDbMock).not.toHaveBeenCalled();
  });

  it('updates primary entity with only cadence', async () => {
    const repository = mockPrimaryRepository(
      { id: 'primary-1', userId: 'user-1', name: 'Test', cadence: 'daily', version: 1 },
      { id: 'primary-1', userId: 'user-1', name: 'Test', cadence: 'weekly', version: 2 },
    );
    (getPrimaryEntityRepository as jest.Mock).mockReturnValue(repository);

    const result = await updatePrimaryEntityLocal({ id: 'primary-1', cadence: 'weekly' });

    expect(result.cadence).toBe('weekly');
  });

  it('updates primary entity with only color', async () => {
    const repository = mockPrimaryRepository(
      { id: 'primary-1', userId: 'user-1', name: 'Test', color: '#000000', version: 1 },
      { id: 'primary-1', userId: 'user-1', name: 'Test', color: '#ff0000', version: 2 },
    );
    (getPrimaryEntityRepository as jest.Mock).mockReturnValue(repository);

    const result = await updatePrimaryEntityLocal({ id: 'primary-1', color: '#ff0000' });

    expect(result.color).toBe('#ff0000');
  });

  it('updates primary entity with only sortOrder', async () => {
    const repository = mockPrimaryRepository(
      { id: 'primary-1', userId: 'user-1', name: 'Test', sortOrder: 0, version: 1 },
      { id: 'primary-1', userId: 'user-1', name: 'Test', sortOrder: 5, version: 2 },
    );
    (getPrimaryEntityRepository as jest.Mock).mockReturnValue(repository);

    const result = await updatePrimaryEntityLocal({ id: 'primary-1', sortOrder: 5 });

    expect(result.sortOrder).toBe(5);
  });

  it('updates primary entity with only isArchived', async () => {
    const repository = mockPrimaryRepository(
      { id: 'primary-1', userId: 'user-1', name: 'Test', isArchived: false, version: 1 },
      { id: 'primary-1', userId: 'user-1', name: 'Test', isArchived: true, version: 2 },
    );
    (getPrimaryEntityRepository as jest.Mock).mockReturnValue(repository);

    const result = await updatePrimaryEntityLocal({ id: 'primary-1', isArchived: true });

    expect(result.isArchived).toBe(true);
  });

  it('updates reminder with only timeLocal', async () => {
    const repository = mockReminderRepository(
      {
        id: 'reminder-1',
        userId: 'user-1',
        [DOMAIN.entities.reminders.foreignKey]: 'primary-1',
        timeLocal: '09:00',
        daysOfWeek: '1,2,3',
        version: 1,
      },
      {
        id: 'reminder-1',
        userId: 'user-1',
        [DOMAIN.entities.reminders.foreignKey]: 'primary-1',
        timeLocal: '10:00',
        daysOfWeek: '1,2,3',
        version: 2,
      },
    );
    (getReminderRepository as jest.Mock).mockReturnValue(repository);

    const result = await updateReminderLocal({ id: 'reminder-1', timeLocal: '10:00' });

    expect(result.timeLocal).toBe('10:00');
  });

  it('updates reminder with only daysOfWeek', async () => {
    const repository = mockReminderRepository(
      {
        id: 'reminder-1',
        userId: 'user-1',
        [DOMAIN.entities.reminders.foreignKey]: 'primary-1',
        timeLocal: '09:00',
        daysOfWeek: '1,2,3',
        version: 1,
      },
      {
        id: 'reminder-1',
        userId: 'user-1',
        [DOMAIN.entities.reminders.foreignKey]: 'primary-1',
        timeLocal: '09:00',
        daysOfWeek: '5,6',
        version: 2,
      },
    );
    (getReminderRepository as jest.Mock).mockReturnValue(repository);

    const result = await updateReminderLocal({ id: 'reminder-1', daysOfWeek: '5,6' });

    expect(result.daysOfWeek).toBe('5,6');
  });

  it('updates reminder with only timezone', async () => {
    const repository = mockReminderRepository(
      {
        id: 'reminder-1',
        userId: 'user-1',
        [DOMAIN.entities.reminders.foreignKey]: 'primary-1',
        timeLocal: '09:00',
        timezone: 'UTC',
        version: 1,
      },
      {
        id: 'reminder-1',
        userId: 'user-1',
        [DOMAIN.entities.reminders.foreignKey]: 'primary-1',
        timeLocal: '09:00',
        timezone: 'America/New_York',
        version: 2,
      },
    );
    (getReminderRepository as jest.Mock).mockReturnValue(repository);

    const result = await updateReminderLocal({ id: 'reminder-1', timezone: 'America/New_York' });

    expect(result.timezone).toBe('America/New_York');
  });

  it('updates reminder with only isEnabled', async () => {
    const repository = mockReminderRepository(
      {
        id: 'reminder-1',
        userId: 'user-1',
        [DOMAIN.entities.reminders.foreignKey]: 'primary-1',
        timeLocal: '09:00',
        isEnabled: true,
        version: 1,
      },
      {
        id: 'reminder-1',
        userId: 'user-1',
        [DOMAIN.entities.reminders.foreignKey]: 'primary-1',
        timeLocal: '09:00',
        isEnabled: false,
        version: 2,
      },
    );
    (getReminderRepository as jest.Mock).mockReturnValue(repository);

    const result = await updateReminderLocal({ id: 'reminder-1', isEnabled: false });

    expect(result.isEnabled).toBe(false);
  });

  it('updates reminder with only foreign key', async () => {
    const repository = mockReminderRepository(
      {
        id: 'reminder-1',
        userId: 'user-1',
        [DOMAIN.entities.reminders.foreignKey]: 'primary-1',
        timeLocal: '09:00',
        version: 1,
      },
      {
        id: 'reminder-1',
        userId: 'user-1',
        [DOMAIN.entities.reminders.foreignKey]: 'primary-2',
        timeLocal: '09:00',
        version: 2,
      },
    );
    (getReminderRepository as jest.Mock).mockReturnValue(repository);

    const result = await updateReminderLocal({
      id: 'reminder-1',
      [DOMAIN.entities.reminders.foreignKey]: 'primary-2',
    });

    expect(result[DOMAIN.entities.reminders.foreignKey]).toBe('primary-2');
  });

  it('deletes primary entity with version increment', async () => {
    const repository = mockPrimaryRepository(
      { id: 'primary-1', userId: 'user-1', name: 'Test', version: 1, deletedAt: null },
      {
        id: 'primary-1',
        userId: 'user-1',
        name: 'Test',
        version: 2,
        deletedAt: expect.any(String),
      },
    );
    (getPrimaryEntityRepository as jest.Mock).mockReturnValue(repository);

    const result = await deletePrimaryEntityLocal('primary-1');

    expect(result?.version).toBe(2);
    expect(result?.deletedAt).toBeDefined();
  });
});

function mockPrimaryRepository(firstRecord: any, secondRecord: any = firstRecord): Repository<any> {
  return {
    insert: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValueOnce(firstRecord).mockResolvedValue(secondRecord),
  };
}

function mockEntryRepository(record: any): Repository<any> {
  return {
    insert: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue(record),
  };
}

function mockReminderRepository(
  firstRecord: any,
  secondRecord: any = firstRecord,
): Repository<any> {
  return {
    insert: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValueOnce(firstRecord).mockResolvedValue(secondRecord),
  };
}

function mockDeviceRepository(record: any): Repository<any> {
  return {
    insert: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue(record),
  };
}
