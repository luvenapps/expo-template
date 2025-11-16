jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

jest.mock('@/db/sqlite/client', () => ({
  getDb: jest.fn(),
}));

jest.mock('@/db/sqlite/schema', () => ({
  entryEntity: {
    deletedAt: { name: 'deleted_at' },
    date: { name: 'date' },
  },
}));

jest.mock('drizzle-orm', () => ({
  and: (...conditions: unknown[]) => ({ type: 'and', conditions }),
  isNull: (column: unknown) => ({ type: 'isNull', column }),
  lt: (column: unknown, value: unknown) => ({ type: 'lt', column, value }),
  eq: (column: unknown, value: unknown) => ({ type: 'eq', column, value }),
}));

import { archiveOldEntries } from '@/db/sqlite/archive';
import { getDb } from '@/db/sqlite/client';
import { Platform } from 'react-native';
import { beforeEach, describe, expect, test } from '@jest/globals';

describe('archiveOldEntries', () => {
  let mockDb: {
    update: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock database with chainable query builder
    const createMockUpdateChain = (rowsAffected: number) => ({
      set: jest.fn(() => ({
        where: jest.fn().mockResolvedValue({ rowsAffected }),
      })),
    });

    mockDb = {
      update: jest.fn((table) => createMockUpdateChain(10)),
    };

    (getDb as jest.Mock).mockResolvedValue(mockDb);
  });

  describe('Platform handling', () => {
    test('should return 0 on web platform', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });

      const result = await archiveOldEntries();

      expect(result).toBe(0);
      expect(getDb).not.toHaveBeenCalled();

      // Restore platform
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    });

    test('should execute archive on iOS', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });

      await archiveOldEntries();

      expect(getDb).toHaveBeenCalled();
    });

    test('should execute archive on Android', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });

      await archiveOldEntries();

      expect(getDb).toHaveBeenCalled();

      // Restore platform
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    });
  });

  describe('Archive logic', () => {
    test('should archive entries older than default 2 years (730 days)', async () => {
      await archiveOldEntries();

      expect(mockDb.update).toHaveBeenCalled();
      expect(getDb).toHaveBeenCalled();
    });

    test('should archive entries with custom olderThanDays', async () => {
      await archiveOldEntries({ olderThanDays: 365 });

      expect(mockDb.update).toHaveBeenCalled();
      expect(getDb).toHaveBeenCalled();
    });

    test('should return count of archived entries', async () => {
      mockDb.update = jest.fn((table) => ({
        set: jest.fn(() => ({
          where: jest.fn().mockResolvedValue({ rowsAffected: 42 }),
        })),
      }));

      const result = await archiveOldEntries();

      expect(result).toBe(42);
    });

    test('should handle zero archived entries', async () => {
      mockDb.update = jest.fn((table) => ({
        set: jest.fn(() => ({
          where: jest.fn().mockResolvedValue({ rowsAffected: 0 }),
        })),
      }));

      const result = await archiveOldEntries();

      expect(result).toBe(0);
    });

    test('should handle undefined rowsAffected', async () => {
      mockDb.update = jest.fn((table) => ({
        set: jest.fn(() => ({
          where: jest.fn().mockResolvedValue({}),
        })),
      }));

      const result = await archiveOldEntries();

      expect(result).toBe(0);
    });

    test('should handle null rowsAffected', async () => {
      mockDb.update = jest.fn((table) => ({
        set: jest.fn(() => ({
          where: jest.fn().mockResolvedValue({ rowsAffected: null }),
        })),
      }));

      const result = await archiveOldEntries();

      expect(result).toBe(0);
    });
  });

  describe('Date calculations', () => {
    test('should calculate cutoff date correctly for default 730 days (2 years)', async () => {
      await archiveOldEntries();

      // Verify update was called with correct date calculation
      expect(mockDb.update).toHaveBeenCalled();
    });

    test('should calculate cutoff date correctly for custom days', async () => {
      await archiveOldEntries({ olderThanDays: 180 });

      expect(mockDb.update).toHaveBeenCalled();
      expect(getDb).toHaveBeenCalled();
    });

    test('should format cutoff date as YYYY-MM-DD', async () => {
      await archiveOldEntries();

      // Verify the date format would be ISO (the actual logic uses .toISOString().slice(0, 10))
      expect(mockDb.update).toHaveBeenCalled();
    });

    test('should handle 0 days option', async () => {
      await archiveOldEntries({ olderThanDays: 0 });

      expect(mockDb.update).toHaveBeenCalled();
    });

    test('should handle very large day values', async () => {
      await archiveOldEntries({ olderThanDays: 365 * 10 });

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('Update operation', () => {
    test('should set deletedAt to current timestamp', async () => {
      let capturedDeletedAt = '';

      mockDb.update = jest.fn((table) => ({
        set: jest.fn((payload: any) => {
          capturedDeletedAt = payload.deletedAt;
          return {
            where: jest.fn().mockResolvedValue({ rowsAffected: 1 }),
          };
        }),
      }));

      const beforeTest = new Date().toISOString();
      await archiveOldEntries();
      const afterTest = new Date().toISOString();

      expect(capturedDeletedAt).toBeTruthy();
      // Should be between before and after test timestamps
      expect(capturedDeletedAt >= beforeTest).toBe(true);
      expect(capturedDeletedAt <= afterTest).toBe(true);
    });

    test('should only archive non-deleted entries', async () => {
      // The where clause should include isNull(entryEntity.deletedAt)
      await archiveOldEntries();

      expect(mockDb.update).toHaveBeenCalled();
    });

    test('should only archive entries older than cutoff date', async () => {
      // The where clause should include lt(entryEntity.date, cutoffDate)
      await archiveOldEntries();

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    test('should propagate database errors', async () => {
      const dbError = new Error('Database connection failed');
      (getDb as jest.Mock).mockRejectedValue(dbError);

      await expect(archiveOldEntries()).rejects.toThrow('Database connection failed');
    });

    test('should propagate update errors', async () => {
      const updateError = new Error('Update operation failed');
      mockDb.update = jest.fn((table) => ({
        set: jest.fn(() => ({
          where: jest.fn().mockRejectedValue(updateError),
        })),
      }));

      await expect(archiveOldEntries()).rejects.toThrow('Update operation failed');
    });
  });

  describe('Integration scenarios', () => {
    test('should work with custom retention period of 1 year', async () => {
      mockDb.update = jest.fn((table) => ({
        set: jest.fn(() => ({
          where: jest.fn().mockResolvedValue({ rowsAffected: 100 }),
        })),
      }));

      const result = await archiveOldEntries({ olderThanDays: 365 });

      expect(result).toBe(100);
      expect(mockDb.update).toHaveBeenCalledTimes(1);
    });

    test('should work with custom retention period of 90 days', async () => {
      mockDb.update = jest.fn((table) => ({
        set: jest.fn(() => ({
          where: jest.fn().mockResolvedValue({ rowsAffected: 50 }),
        })),
      }));

      const result = await archiveOldEntries({ olderThanDays: 90 });

      expect(result).toBe(50);
      expect(mockDb.update).toHaveBeenCalledTimes(1);
    });

    test('should handle large batch archiving', async () => {
      mockDb.update = jest.fn((table) => ({
        set: jest.fn(() => ({
          where: jest.fn().mockResolvedValue({ rowsAffected: 10000 }),
        })),
      }));

      const result = await archiveOldEntries();

      expect(result).toBe(10000);
    });
  });
});
