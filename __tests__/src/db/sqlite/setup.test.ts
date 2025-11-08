import { DOMAIN } from '@/config/domain.config';
import { Platform } from 'react-native';

const PRIMARY_TABLE = DOMAIN.entities.primary.tableName;
const ENTRIES_TABLE = DOMAIN.entities.entries.tableName;

function createMockDatabase(initialVersion: number) {
  const execCalls: string[] = [];
  const db = {
    getFirstSync: jest.fn(() => ({ user_version: initialVersion })),
    execSync: jest.fn((statement: string) => {
      execCalls.push(statement);
    }),
    withTransactionSync: jest.fn((callback: () => void) => {
      callback();
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

  it('applies schema statements when user_version is outdated', () => {
    const { ensureSqliteSchema } = require('@/db/sqlite/setup');
    const { db, execCalls } = createMockDatabase(0);

    ensureSqliteSchema(db);

    expect(db.withTransactionSync).toHaveBeenCalledTimes(1);
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

  it('skips execution when schema version already applied', () => {
    const { ensureSqliteSchema } = require('@/db/sqlite/setup');
    const { db } = createMockDatabase(1);

    ensureSqliteSchema(db);

    expect(db.withTransactionSync).not.toHaveBeenCalled();
    expect(db.execSync).not.toHaveBeenCalled();
  });

  it('should skip initialization on web platform', () => {
    // Mock Platform.OS to be 'web'
    Object.defineProperty(Platform, 'OS', {
      get: () => 'web',
      configurable: true,
    });

    const { ensureSqliteSchema } = require('@/db/sqlite/setup');
    const { db } = createMockDatabase(0);

    ensureSqliteSchema(db);

    expect(db.getFirstSync).not.toHaveBeenCalled();
    expect(db.withTransactionSync).not.toHaveBeenCalled();

    // Reset Platform.OS
    Object.defineProperty(Platform, 'OS', {
      get: () => 'ios',
      configurable: true,
    });
  });

  it('should handle statement execution errors', () => {
    const { ensureSqliteSchema } = require('@/db/sqlite/setup');
    const db = {
      getFirstSync: jest.fn(() => ({ user_version: 0 })),
      execSync: jest.fn((statement: string) => {
        if (statement.includes('CREATE TABLE')) {
          throw new Error('SQL syntax error');
        }
      }),
      withTransactionSync: jest.fn((callback: () => void) => {
        callback();
      }),
    };

    expect(() => ensureSqliteSchema(db as any)).toThrow('SQL syntax error');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[SQLite Setup] Failed to execute statement'),
      expect.any(Error),
    );
  });

  it('should retry on stale handle error', () => {
    const { ensureSqliteSchema } = require('@/db/sqlite/setup');
    let attemptCount = 0;
    const db = {
      getFirstSync: jest.fn(() => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('NullPointerException');
        }
        return { user_version: 0 };
      }),
      execSync: jest.fn(),
      withTransactionSync: jest.fn((callback: () => void) => {
        callback();
      }),
    };

    ensureSqliteSchema(db as any);

    expect(db.getFirstSync).toHaveBeenCalledTimes(2);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[SQLite Setup] Stale handle detected, will retry...',
    );
  });

  it('should throw error after exhausting retries', () => {
    const { ensureSqliteSchema } = require('@/db/sqlite/setup');
    const db = {
      getFirstSync: jest.fn(() => {
        throw new Error('database is closed');
      }),
      execSync: jest.fn(),
      withTransactionSync: jest.fn(),
    };

    expect(() => ensureSqliteSchema(db as any)).toThrow('database is closed');
    expect(db.getFirstSync).toHaveBeenCalledTimes(2); // Initial attempt + 1 retry
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[SQLite Setup] Schema initialization failed:',
      expect.any(Error),
    );
  });

  it('should throw non-stale-handle errors immediately', () => {
    const { ensureSqliteSchema } = require('@/db/sqlite/setup');
    const db = {
      getFirstSync: jest.fn(() => {
        throw new Error('Permission denied');
      }),
      execSync: jest.fn(),
      withTransactionSync: jest.fn(),
    };

    expect(() => ensureSqliteSchema(db as any)).toThrow('Permission denied');
    expect(db.getFirstSync).toHaveBeenCalledTimes(1); // No retry for non-stale errors
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[SQLite Setup] Schema initialization failed:',
      expect.any(Error),
    );
  });
});

describe('resetSchemaInitialization', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('should reset initialization state', () => {
    const { ensureSqliteSchema, resetSchemaInitialization } = require('@/db/sqlite/setup');
    const { db } = createMockDatabase(1);

    // First call - should skip because version is up to date
    ensureSqliteSchema(db);
    expect(db.getFirstSync).toHaveBeenCalledTimes(1);

    // Reset modules to get fresh state
    db.getFirstSync.mockClear();

    // Second call without reset - should also skip (already initialized)
    ensureSqliteSchema(db);
    expect(db.getFirstSync).not.toHaveBeenCalled();

    // Reset initialization
    resetSchemaInitialization();

    // Third call after reset - should check version again
    ensureSqliteSchema(db);
    expect(db.getFirstSync).toHaveBeenCalledTimes(1);
  });
});
