import { DOMAIN } from '@/config/domain.config';
import { Platform } from 'react-native';

const PRIMARY_TABLE = DOMAIN.entities.primary.tableName;
const ENTRIES_TABLE = DOMAIN.entities.entries.tableName;

function createMockDatabase(initialVersion: number) {
  const execCalls: string[] = [];
  const db = {
    getFirstAsync: jest.fn(async () => ({ user_version: initialVersion })),
    execAsync: jest.fn(async (statement: string) => {
      execCalls.push(statement);
    }),
    withTransactionAsync: jest.fn(async (callback: () => Promise<void> | void) => {
      await callback();
    }),
  };

  return { db: db as any, execCalls };
}

describe('ensureSqliteSchema', () => {
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('applies schema statements when user_version is outdated', async () => {
    const { ensureSqliteSchema } = require('@/db/sqlite/setup');
    const { db, execCalls } = createMockDatabase(0);

    await ensureSqliteSchema(db);

    expect(db.withTransactionAsync).toHaveBeenCalledTimes(1);
    expect(execCalls).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`CREATE TABLE IF NOT EXISTS "${PRIMARY_TABLE}"`),
        expect.stringContaining(`CREATE TABLE IF NOT EXISTS "${ENTRIES_TABLE}"`),
        expect.stringContaining('CREATE TABLE IF NOT EXISTS "outbox"'),
        expect.stringContaining('CREATE INDEX IF NOT EXISTS "outbox_table_attempts_idx"'),
        'PRAGMA user_version = 1',
      ]),
    );
  });

  it('skips execution when schema version already applied', async () => {
    const { ensureSqliteSchema } = require('@/db/sqlite/setup');
    const { db } = createMockDatabase(1);

    await ensureSqliteSchema(db);

    expect(db.withTransactionAsync).not.toHaveBeenCalled();
    expect(db.execAsync).not.toHaveBeenCalled();
  });

  it('should skip initialization on web platform', async () => {
    // Mock Platform.OS to be 'web'
    Object.defineProperty(Platform, 'OS', {
      get: () => 'web',
      configurable: true,
    });

    const { ensureSqliteSchema } = require('@/db/sqlite/setup');
    const { db } = createMockDatabase(0);

    await ensureSqliteSchema(db);

    expect(db.getFirstAsync).not.toHaveBeenCalled();
    expect(db.withTransactionAsync).not.toHaveBeenCalled();

    // Reset Platform.OS
    Object.defineProperty(Platform, 'OS', {
      get: () => 'ios',
      configurable: true,
    });
  });

  it('should handle statement execution errors', async () => {
    const { ensureSqliteSchema } = require('@/db/sqlite/setup');
    const db = {
      getFirstAsync: jest.fn(async () => ({ user_version: 0 })),
      execAsync: jest.fn(async (statement: string) => {
        if (statement.includes('CREATE TABLE')) {
          throw new Error('SQL syntax error');
        }
      }),
      withTransactionAsync: jest.fn(async (callback: () => Promise<void> | void) => {
        await callback();
      }),
    };

    await expect(ensureSqliteSchema(db as any)).rejects.toThrow('SQL syntax error');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[SQLite:setup] Failed to execute statement'),
      expect.any(Error),
    );
  });

  it('should retry on stale handle error', async () => {
    const { ensureSqliteSchema } = require('@/db/sqlite/setup');
    let attemptCount = 0;
    const db = {
      getFirstAsync: jest.fn(async () => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('NullPointerException');
        }
        return { user_version: 0 };
      }),
      execAsync: jest.fn(),
      withTransactionAsync: jest.fn(async (callback: () => Promise<void> | void) => {
        await callback();
      }),
    };

    await ensureSqliteSchema(db as any);

    expect(db.getFirstAsync).toHaveBeenCalledTimes(2);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[SQLite:setup] Stale handle detected, will retry...',
      expect.anything(),
    );
  });

  it('should throw error after exhausting retries', async () => {
    const { ensureSqliteSchema } = require('@/db/sqlite/setup');
    const db = {
      getFirstAsync: jest.fn(async () => {
        throw new Error('database is closed');
      }),
      execAsync: jest.fn(),
      withTransactionAsync: jest.fn(),
    };

    await expect(ensureSqliteSchema(db as any)).rejects.toThrow('database is closed');
    expect(db.getFirstAsync).toHaveBeenCalledTimes(2); // Initial attempt + 1 retry
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[SQLite:setup] Schema initialization failed:',
      expect.any(Error),
    );
  });

  it('should throw non-stale-handle errors immediately', async () => {
    const { ensureSqliteSchema } = require('@/db/sqlite/setup');
    const db = {
      getFirstAsync: jest.fn(async () => {
        throw new Error('Permission denied');
      }),
      execAsync: jest.fn(),
      withTransactionAsync: jest.fn(),
    };

    await expect(ensureSqliteSchema(db as any)).rejects.toThrow('Permission denied');
    expect(db.getFirstAsync).toHaveBeenCalledTimes(1); // No retry for non-stale errors
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[SQLite:setup] Schema initialization failed:',
      expect.any(Error),
    );
  });
});

describe('resetSchemaInitialization', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('should reset initialization state', async () => {
    const { ensureSqliteSchema, resetSchemaInitialization } = require('@/db/sqlite/setup');
    const { db } = createMockDatabase(1);

    // First call - should skip because version is up to date
    await ensureSqliteSchema(db);
    expect(db.getFirstAsync).toHaveBeenCalledTimes(1);

    // Reset modules to get fresh state
    db.getFirstAsync.mockClear();

    // Second call without reset - should also skip (already initialized)
    await ensureSqliteSchema(db);
    expect(db.getFirstAsync).not.toHaveBeenCalled();

    // Reset initialization
    resetSchemaInitialization();

    // Third call after reset - should check version again
    await ensureSqliteSchema(db);
    expect(db.getFirstAsync).toHaveBeenCalledTimes(1);
  });
});
