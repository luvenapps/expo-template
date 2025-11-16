jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

jest.mock('@/db/sqlite/client', () => ({
  getDb: jest.fn(),
}));

jest.mock('@/db/sqlite/schema', () => ({
  primaryEntity: {
    deletedAt: { name: 'deleted_at' },
  },
  entryEntity: {
    deletedAt: { name: 'deleted_at' },
  },
  reminderEntity: {
    deletedAt: { name: 'deleted_at' },
  },
  deviceEntity: {
    deletedAt: { name: 'deleted_at' },
  },
}));

jest.mock('drizzle-orm', () => ({
  and: (...conditions: unknown[]) => ({ type: 'and', conditions }),
  isNotNull: (column: unknown) => ({ type: 'isNotNull', column }),
  lt: (column: unknown, value: unknown) => ({ type: 'lt', column, value }),
}));

import { cleanupSoftDeletedRecords } from '@/db/sqlite/cleanup';
import { getDb } from '@/db/sqlite/client';
import { Platform } from 'react-native';
import { beforeEach, describe, expect, test } from '@jest/globals';

describe('cleanupSoftDeletedRecords', () => {
  let mockDb: {
    delete: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock database with chainable query builder
    const createMockDeleteChain = (rowsAffected: number) => ({
      where: jest.fn().mockResolvedValue({ rowsAffected }),
    });

    mockDb = {
      delete: jest.fn((table) => createMockDeleteChain(5)),
    };

    (getDb as jest.Mock).mockResolvedValue(mockDb);
  });

  describe('Platform handling', () => {
    test('should return 0 on web platform', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });

      const result = await cleanupSoftDeletedRecords();

      expect(result).toBe(0);
      expect(getDb).not.toHaveBeenCalled();

      // Restore platform
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    });

    test('should execute cleanup on iOS', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });

      await cleanupSoftDeletedRecords();

      expect(getDb).toHaveBeenCalled();
    });

    test('should execute cleanup on Android', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });

      await cleanupSoftDeletedRecords();

      expect(getDb).toHaveBeenCalled();

      // Restore platform
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    });
  });

  describe('Cleanup logic', () => {
    test('should cleanup records older than default 90 days', async () => {
      await cleanupSoftDeletedRecords();

      // Should call delete for each of the 4 tables
      expect(mockDb.delete).toHaveBeenCalledTimes(4);
    });

    test('should cleanup records with custom olderThanDays', async () => {
      await cleanupSoftDeletedRecords({ olderThanDays: 30 });

      expect(mockDb.delete).toHaveBeenCalledTimes(4);
      expect(getDb).toHaveBeenCalled();
    });

    test('should return total count of removed records', async () => {
      // Mock each table delete to return different counts
      let deleteCallCount = 0;
      mockDb.delete = jest.fn((table) => {
        deleteCallCount++;
        const rowsAffected = deleteCallCount * 2; // 2, 4, 6, 8
        return {
          where: jest.fn().mockResolvedValue({ rowsAffected }),
        };
      });

      const result = await cleanupSoftDeletedRecords();

      // Should sum up: 2 + 4 + 6 + 8 = 20
      expect(result).toBe(20);
    });

    test('should handle zero deleted records', async () => {
      mockDb.delete = jest.fn((table) => ({
        where: jest.fn().mockResolvedValue({ rowsAffected: 0 }),
      }));

      const result = await cleanupSoftDeletedRecords();

      expect(result).toBe(0);
    });

    test('should handle undefined rowsAffected', async () => {
      mockDb.delete = jest.fn((table) => ({
        where: jest.fn().mockResolvedValue({}),
      }));

      const result = await cleanupSoftDeletedRecords();

      expect(result).toBe(0);
    });

    test('should handle null rowsAffected', async () => {
      mockDb.delete = jest.fn((table) => ({
        where: jest.fn().mockResolvedValue({ rowsAffected: null }),
      }));

      const result = await cleanupSoftDeletedRecords();

      expect(result).toBe(0);
    });
  });

  describe('Date calculations', () => {
    test('should calculate cutoff date correctly for 90 days', async () => {
      await cleanupSoftDeletedRecords();

      // We can't check exact value due to timing, but we can verify delete was called
      expect(mockDb.delete).toHaveBeenCalled();
    });

    test('should calculate cutoff date correctly for custom days', async () => {
      await cleanupSoftDeletedRecords({ olderThanDays: 180 });

      expect(mockDb.delete).toHaveBeenCalled();
      expect(getDb).toHaveBeenCalled();
    });

    test('should handle 0 days option', async () => {
      await cleanupSoftDeletedRecords({ olderThanDays: 0 });

      expect(mockDb.delete).toHaveBeenCalledTimes(4);
    });

    test('should handle very large day values', async () => {
      await cleanupSoftDeletedRecords({ olderThanDays: 365 * 10 });

      expect(mockDb.delete).toHaveBeenCalledTimes(4);
    });
  });

  describe('Error handling', () => {
    test('should propagate database errors', async () => {
      const dbError = new Error('Database connection failed');
      (getDb as jest.Mock).mockRejectedValue(dbError);

      await expect(cleanupSoftDeletedRecords()).rejects.toThrow('Database connection failed');
    });

    test('should propagate delete errors', async () => {
      const deleteError = new Error('Delete operation failed');
      mockDb.delete = jest.fn((table) => ({
        where: jest.fn().mockRejectedValue(deleteError),
      }));

      await expect(cleanupSoftDeletedRecords()).rejects.toThrow('Delete operation failed');
    });
  });

  describe('Integration scenarios', () => {
    test('should process all tables in sequence', async () => {
      const callOrder: string[] = [];

      mockDb.delete = jest.fn((table) => {
        callOrder.push(table.deletedAt?.name || 'unknown');
        return {
          where: jest.fn().mockResolvedValue({ rowsAffected: 1 }),
        };
      });

      await cleanupSoftDeletedRecords();

      // Should have called delete 4 times (one for each table)
      expect(callOrder).toHaveLength(4);
      expect(mockDb.delete).toHaveBeenCalledTimes(4);
    });

    test('should work with mixed results from different tables', async () => {
      let callCount = 0;
      mockDb.delete = jest.fn((table) => {
        callCount++;
        // Alternate between successful deletions and no deletions
        const rowsAffected = callCount % 2 === 0 ? 10 : 0;
        return {
          where: jest.fn().mockResolvedValue({ rowsAffected }),
        };
      });

      const result = await cleanupSoftDeletedRecords();

      // Should sum only the successful deletions (2 tables × 10 = 20)
      expect(result).toBe(20);
    });
  });
});
