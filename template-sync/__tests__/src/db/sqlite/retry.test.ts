// Mock resetDatabase before importing retry module
jest.mock('@/db/sqlite/client', () => ({
  resetDatabase: jest.fn(),
}));

import { withDatabaseRetry } from '@/db/sqlite/retry';
import { resetDatabase } from '@/db/sqlite/client';

// Cast to jest mock so we can use mock methods
const mockedResetDatabase = resetDatabase as jest.MockedFunction<typeof resetDatabase>;

describe('withDatabaseRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedResetDatabase.mockResolvedValue();
  });

  it('should execute operation successfully on first try', async () => {
    const operation = jest.fn().mockResolvedValue('success');

    const result = await withDatabaseRetry(operation);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
    expect(mockedResetDatabase).not.toHaveBeenCalled();
  });

  it('should throw non-stale-handle errors immediately', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('Some other error'));

    await expect(withDatabaseRetry(operation)).rejects.toThrow('Some other error');
    expect(operation).toHaveBeenCalledTimes(1);
    expect(mockedResetDatabase).not.toHaveBeenCalled();
  });

  it('should retry after stale handle error with "database is closed"', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const operation = jest
      .fn()
      .mockRejectedValueOnce(new Error('database is closed'))
      .mockResolvedValueOnce('success after retry');

    const result = await withDatabaseRetry(operation);

    expect(result).toBe('success after retry');
    expect(operation).toHaveBeenCalledTimes(2);
    expect(mockedResetDatabase).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        '[SQLite] Encountered stale handle. Resetting database and retrying…',
      ),
      expect.anything(),
    );

    consoleWarnSpy.mockRestore();
  });

  it('should retry after stale handle error with "NullPointerException"', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const operation = jest
      .fn()
      .mockRejectedValueOnce(new Error('NullPointerException in native code'))
      .mockResolvedValueOnce('success after retry');

    const result = await withDatabaseRetry(operation);

    expect(result).toBe('success after retry');
    expect(operation).toHaveBeenCalledTimes(2);
    expect(mockedResetDatabase).toHaveBeenCalledTimes(1);

    consoleWarnSpy.mockRestore();
  });

  it('should retry after stale handle error with "NativeDatabase.prepareSync"', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const operation = jest
      .fn()
      .mockRejectedValueOnce(new Error('Error in NativeDatabase.prepareSync'))
      .mockResolvedValueOnce('success after retry');

    const result = await withDatabaseRetry(operation);

    expect(result).toBe('success after retry');
    expect(operation).toHaveBeenCalledTimes(2);
    expect(mockedResetDatabase).toHaveBeenCalledTimes(1);

    consoleWarnSpy.mockRestore();
  });

  it('should throw error if retry also fails', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const operation = jest
      .fn()
      .mockRejectedValueOnce(new Error('database is closed'))
      .mockRejectedValueOnce(new Error('Retry failed'));

    await expect(withDatabaseRetry(operation)).rejects.toThrow('Retry failed');
    expect(operation).toHaveBeenCalledTimes(2);
    expect(mockedResetDatabase).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[SQLite] Operation failed again after database reset:'),
      expect.any(Error),
    );

    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should handle non-Error objects gracefully', async () => {
    const operation = jest.fn().mockRejectedValue('string error');

    await expect(withDatabaseRetry(operation)).rejects.toBe('string error');
    expect(operation).toHaveBeenCalledTimes(1);
    expect(mockedResetDatabase).not.toHaveBeenCalled();
  });
});
