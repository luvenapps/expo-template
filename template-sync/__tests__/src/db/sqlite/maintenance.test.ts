jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

jest.mock('@/config/domain.config', () => ({
  DOMAIN: {
    app: {
      database: 'test-database.db',
    },
  },
}));

const mockExecAsync = jest.fn();

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

import { optimizeDatabase } from '@/db/sqlite/maintenance';
import { openDatabaseAsync } from 'expo-sqlite';
import { Platform } from 'react-native';
import { beforeEach, describe, expect, test } from '@jest/globals';

const mockOpenDatabaseAsync = openDatabaseAsync as jest.MockedFunction<typeof openDatabaseAsync>;

describe('optimizeDatabase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExecAsync.mockResolvedValue(undefined);
    mockOpenDatabaseAsync.mockResolvedValue({
      execAsync: mockExecAsync,
    } as any);
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
  });

  describe('Platform handling', () => {
    test('should return early on web platform', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });

      const result = await optimizeDatabase();

      expect(result).toEqual({
        vacuumed: false,
        optimized: false,
        pragmas: false,
      });
      expect(mockOpenDatabaseAsync).not.toHaveBeenCalled();

      // Restore platform
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    });

    test('should execute on iOS platform', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });

      const result = await optimizeDatabase();

      expect(mockOpenDatabaseAsync).toHaveBeenCalledWith('test-database.db');
      expect(result.optimized).toBe(true);
    });

    test('should execute on Android platform', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });

      const result = await optimizeDatabase();

      expect(mockOpenDatabaseAsync).toHaveBeenCalledWith('test-database.db');
      expect(result.optimized).toBe(true);

      // Restore platform
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    });
  });

  describe('Default behavior', () => {
    test('should run vacuum and pragmas by default', async () => {
      const result = await optimizeDatabase();

      // Should run pragma commands
      expect(mockExecAsync).toHaveBeenCalledWith('PRAGMA journal_mode=WAL');
      expect(mockExecAsync).toHaveBeenCalledWith('PRAGMA synchronous=NORMAL');
      expect(mockExecAsync).toHaveBeenCalledWith('PRAGMA wal_autocheckpoint=100');

      // Should run VACUUM
      expect(mockExecAsync).toHaveBeenCalledWith('VACUUM');

      // Should always run optimize
      expect(mockExecAsync).toHaveBeenCalledWith('PRAGMA optimize');

      expect(result).toEqual({
        vacuumed: true,
        pragmas: true,
        optimized: true,
      });
    });

    test('should call execAsync with correct database handle', async () => {
      await optimizeDatabase();

      expect(mockOpenDatabaseAsync).toHaveBeenCalledWith('test-database.db');
      expect(mockExecAsync).toHaveBeenCalled();
    });
  });

  describe('Vacuum option', () => {
    test('should skip VACUUM when vacuum option is false', async () => {
      const result = await optimizeDatabase({ vacuum: false });

      expect(mockExecAsync).not.toHaveBeenCalledWith('VACUUM');
      expect(mockExecAsync).toHaveBeenCalledWith('PRAGMA optimize');

      expect(result).toEqual({
        vacuumed: false,
        pragmas: true,
        optimized: true,
      });
    });

    test('should run VACUUM when vacuum option is true', async () => {
      const result = await optimizeDatabase({ vacuum: true });

      expect(mockExecAsync).toHaveBeenCalledWith('VACUUM');

      expect(result.vacuumed).toBe(true);
    });

    test('should run VACUUM when vacuum option is explicitly true', async () => {
      const result = await optimizeDatabase({ vacuum: true });

      expect(mockExecAsync).toHaveBeenCalledWith('VACUUM');
      expect(result.vacuumed).toBe(true);
      expect(result.optimized).toBe(true);
    });
  });

  describe('Pragmas option', () => {
    test('should skip PRAGMA commands when pragmas option is false', async () => {
      const result = await optimizeDatabase({ pragmas: false });

      expect(mockExecAsync).not.toHaveBeenCalledWith('PRAGMA journal_mode=WAL');
      expect(mockExecAsync).not.toHaveBeenCalledWith('PRAGMA synchronous=NORMAL');
      expect(mockExecAsync).not.toHaveBeenCalledWith('PRAGMA wal_autocheckpoint=100');

      // Should still run VACUUM and optimize
      expect(mockExecAsync).toHaveBeenCalledWith('VACUUM');
      expect(mockExecAsync).toHaveBeenCalledWith('PRAGMA optimize');

      expect(result).toEqual({
        vacuumed: true,
        pragmas: false,
        optimized: true,
      });
    });

    test('should run PRAGMA commands when pragmas option is true', async () => {
      const result = await optimizeDatabase({ pragmas: true });

      expect(mockExecAsync).toHaveBeenCalledWith('PRAGMA journal_mode=WAL');
      expect(mockExecAsync).toHaveBeenCalledWith('PRAGMA synchronous=NORMAL');
      expect(mockExecAsync).toHaveBeenCalledWith('PRAGMA wal_autocheckpoint=100');

      expect(result.pragmas).toBe(true);
    });

    test('should run all three PRAGMA commands in correct order', async () => {
      await optimizeDatabase({ pragmas: true });

      const calls = mockExecAsync.mock.calls.map((call) => call[0]);
      const pragmaIndex1 = calls.indexOf('PRAGMA journal_mode=WAL');
      const pragmaIndex2 = calls.indexOf('PRAGMA synchronous=NORMAL');
      const pragmaIndex3 = calls.indexOf('PRAGMA wal_autocheckpoint=100');
      const vacuumIndex = calls.indexOf('VACUUM');

      // All pragmas should come before VACUUM
      expect(pragmaIndex1).toBeLessThan(vacuumIndex);
      expect(pragmaIndex2).toBeLessThan(vacuumIndex);
      expect(pragmaIndex3).toBeLessThan(vacuumIndex);
    });
  });

  describe('Combined options', () => {
    test('should disable both vacuum and pragmas', async () => {
      const result = await optimizeDatabase({ vacuum: false, pragmas: false });

      expect(mockExecAsync).not.toHaveBeenCalledWith('VACUUM');
      expect(mockExecAsync).not.toHaveBeenCalledWith('PRAGMA journal_mode=WAL');
      expect(mockExecAsync).not.toHaveBeenCalledWith('PRAGMA synchronous=NORMAL');
      expect(mockExecAsync).not.toHaveBeenCalledWith('PRAGMA wal_autocheckpoint=100');

      // Should still run optimize
      expect(mockExecAsync).toHaveBeenCalledWith('PRAGMA optimize');

      expect(result).toEqual({
        vacuumed: false,
        pragmas: false,
        optimized: true,
      });
    });

    test('should enable both vacuum and pragmas explicitly', async () => {
      const result = await optimizeDatabase({ vacuum: true, pragmas: true });

      expect(mockExecAsync).toHaveBeenCalledWith('VACUUM');
      expect(mockExecAsync).toHaveBeenCalledWith('PRAGMA journal_mode=WAL');
      expect(mockExecAsync).toHaveBeenCalledWith('PRAGMA synchronous=NORMAL');
      expect(mockExecAsync).toHaveBeenCalledWith('PRAGMA wal_autocheckpoint=100');
      expect(mockExecAsync).toHaveBeenCalledWith('PRAGMA optimize');

      expect(result).toEqual({
        vacuumed: true,
        pragmas: true,
        optimized: true,
      });
    });
  });

  describe('PRAGMA optimize', () => {
    test('should always run PRAGMA optimize regardless of options', async () => {
      await optimizeDatabase({ vacuum: false, pragmas: false });

      expect(mockExecAsync).toHaveBeenCalledWith('PRAGMA optimize');
    });

    test('should run PRAGMA optimize as last command', async () => {
      await optimizeDatabase();

      const calls = mockExecAsync.mock.calls.map((call) => call[0]);
      const optimizeIndex = calls.indexOf('PRAGMA optimize');

      expect(optimizeIndex).toBe(calls.length - 1);
    });

    test('should run PRAGMA optimize after VACUUM', async () => {
      await optimizeDatabase({ vacuum: true, pragmas: false });

      const calls = mockExecAsync.mock.calls.map((call) => call[0]);
      const vacuumIndex = calls.indexOf('VACUUM');
      const optimizeIndex = calls.indexOf('PRAGMA optimize');

      expect(optimizeIndex).toBeGreaterThan(vacuumIndex);
    });
  });

  describe('Error handling', () => {
    test('should propagate errors from openDatabaseAsync', async () => {
      mockOpenDatabaseAsync.mockRejectedValueOnce(new Error('Database open failed'));

      await expect(optimizeDatabase()).rejects.toThrow('Database open failed');
    });

    test('should propagate errors from execAsync', async () => {
      mockExecAsync.mockRejectedValueOnce(new Error('VACUUM failed'));

      await expect(optimizeDatabase()).rejects.toThrow('VACUUM failed');
    });

    test('should propagate errors from PRAGMA commands', async () => {
      mockExecAsync.mockRejectedValueOnce(new Error('PRAGMA failed'));

      await expect(optimizeDatabase()).rejects.toThrow('PRAGMA failed');
    });

    test('should propagate errors from PRAGMA optimize', async () => {
      mockExecAsync
        .mockResolvedValueOnce(undefined) // journal_mode
        .mockResolvedValueOnce(undefined) // synchronous
        .mockResolvedValueOnce(undefined) // wal_autocheckpoint
        .mockResolvedValueOnce(undefined) // VACUUM
        .mockRejectedValueOnce(new Error('Optimize failed')); // PRAGMA optimize

      await expect(optimizeDatabase()).rejects.toThrow('Optimize failed');
    });
  });

  describe('Database handle', () => {
    test('should open database with correct name from config', async () => {
      await optimizeDatabase();

      expect(mockOpenDatabaseAsync).toHaveBeenCalledWith('test-database.db');
    });

    test('should reuse database handle for all operations', async () => {
      await optimizeDatabase();

      // Should open database only once
      expect(mockOpenDatabaseAsync).toHaveBeenCalledTimes(1);

      // Should call execAsync multiple times on the same handle
      expect(mockExecAsync.mock.instances.length).toBeGreaterThan(0);
    });
  });

  describe('Return value', () => {
    test('should return correct flags when vacuum is disabled', async () => {
      const result = await optimizeDatabase({ vacuum: false });

      expect(result.vacuumed).toBe(false);
      expect(result.pragmas).toBe(true);
      expect(result.optimized).toBe(true);
    });

    test('should return correct flags when pragmas are disabled', async () => {
      const result = await optimizeDatabase({ pragmas: false });

      expect(result.vacuumed).toBe(true);
      expect(result.pragmas).toBe(false);
      expect(result.optimized).toBe(true);
    });

    test('should always return optimized as true on native platforms', async () => {
      const result1 = await optimizeDatabase({ vacuum: false, pragmas: false });
      const result2 = await optimizeDatabase({ vacuum: true, pragmas: true });

      expect(result1.optimized).toBe(true);
      expect(result2.optimized).toBe(true);
    });
  });

  describe('Edge cases', () => {
    test('should handle empty options object', async () => {
      const result = await optimizeDatabase({});

      expect(result).toEqual({
        vacuumed: true,
        pragmas: true,
        optimized: true,
      });
    });

    test('should handle undefined options', async () => {
      const result = await optimizeDatabase(undefined);

      expect(result).toEqual({
        vacuumed: true,
        pragmas: true,
        optimized: true,
      });
    });

    test('should handle multiple sequential calls', async () => {
      await optimizeDatabase();
      await optimizeDatabase();
      await optimizeDatabase();

      expect(mockOpenDatabaseAsync).toHaveBeenCalledTimes(3);
    });
  });
});
