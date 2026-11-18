import {
  getQueryClient,
  getQueryClientPersistOptions,
  resetQueryClient,
} from '@/state/queryClient';
import { afterEach, describe, expect, test } from '@jest/globals';
import { Platform } from 'react-native';
import * as idbKeyval from 'idb-keyval';

jest.mock('idb-keyval');

// Capture the storage object passed to createAsyncStoragePersister
let capturedStorage: any = null;
jest.mock('@tanstack/query-async-storage-persister', () => ({
  createAsyncStoragePersister: jest.fn((options: any) => {
    capturedStorage = options.storage;
    return {
      persistClient: jest.fn(),
      restoreClient: jest.fn(),
      removeClient: jest.fn(),
    };
  }),
}));

describe('queryClient singleton', () => {
  afterEach(() => {
    resetQueryClient();
  });

  test('returns same instance across calls', () => {
    const a = getQueryClient();
    const b = getQueryClient();

    expect(a).toBe(b);
  });

  test('reset creates a new instance', () => {
    const a = getQueryClient();
    resetQueryClient();
    const b = getQueryClient();

    expect(b).not.toBe(a);
  });

  test('persist options return null by default (native)', () => {
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'ios' });

    expect(getQueryClientPersistOptions()).toBeNull();

    Object.defineProperty(Platform, 'OS', { value: original });
  });

  test('persist options created on web', () => {
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web' });
    // ensure window exists for the duration of the test
    const globalRef = global as { window?: unknown };
    const originalWindow = globalRef.window;
    globalRef.window = {};

    const options = getQueryClientPersistOptions();

    expect(options).not.toBeNull();
    expect(options?.persister).toBeTruthy();

    resetQueryClient();
    Object.defineProperty(Platform, 'OS', { value: original });
    if (originalWindow === undefined) {
      delete globalRef.window;
    } else {
      globalRef.window = originalWindow;
    }
  });

  test('persist options cached on subsequent calls (web)', () => {
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web' });
    const globalRef = global as { window?: unknown };
    const originalWindow = globalRef.window;
    globalRef.window = {};

    const options1 = getQueryClientPersistOptions();
    const options2 = getQueryClientPersistOptions();

    // Should return the same cached instance
    expect(options1).toBe(options2);

    resetQueryClient();
    Object.defineProperty(Platform, 'OS', { value: original });
    if (originalWindow === undefined) {
      delete globalRef.window;
    } else {
      globalRef.window = originalWindow;
    }
  });

  test('persist options include complete configuration', () => {
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web' });
    const globalRef = global as { window?: unknown };
    const originalWindow = globalRef.window;
    globalRef.window = {};

    const options = getQueryClientPersistOptions();

    // Verify dehydrateOptions is configured
    expect(options?.dehydrateOptions).toBeTruthy();
    expect(options?.dehydrateOptions?.shouldDehydrateQuery).toBeTruthy();

    // Verify maxAge is set (24 hours)
    expect(options?.maxAge).toBe(1000 * 60 * 60 * 24);

    // Verify persister exists
    expect(options?.persister).toBeTruthy();

    resetQueryClient();
    Object.defineProperty(Platform, 'OS', { value: original });
    if (originalWindow === undefined) {
      delete globalRef.window;
    } else {
      globalRef.window = originalWindow;
    }
  });

  test('shouldDehydrateQuery returns true', () => {
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web' });
    const globalRef = global as { window?: unknown };
    const originalWindow = globalRef.window;
    globalRef.window = {};

    const options = getQueryClientPersistOptions();
    const shouldDehydrate = options?.dehydrateOptions?.shouldDehydrateQuery;

    expect(shouldDehydrate).toBeTruthy();
    expect(shouldDehydrate?.({} as any)).toBe(true);

    resetQueryClient();
    Object.defineProperty(Platform, 'OS', { value: original });
    if (originalWindow === undefined) {
      delete globalRef.window;
    } else {
      globalRef.window = originalWindow;
    }
  });

  test('storage methods call idb-keyval functions', async () => {
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web' });
    const globalRef = global as { window?: unknown };
    const originalWindow = globalRef.window;
    globalRef.window = {};

    const mockGet = jest.fn().mockResolvedValue('test-value');
    const mockSet = jest.fn().mockResolvedValue(undefined);
    const mockDel = jest.fn().mockResolvedValue(undefined);

    (idbKeyval.get as jest.Mock).mockImplementation(mockGet);
    (idbKeyval.set as jest.Mock).mockImplementation(mockSet);
    (idbKeyval.del as jest.Mock).mockImplementation(mockDel);

    // Clear any cached options to force recreation
    resetQueryClient();
    capturedStorage = null;

    const options = getQueryClientPersistOptions();

    expect(options).toBeTruthy();
    expect(capturedStorage).toBeTruthy();

    // Test getItem - this calls the arrow function on line 43
    await capturedStorage.getItem('test-key');
    expect(mockGet).toHaveBeenCalledWith('test-key');

    // Test setItem - this calls the arrow function on line 44
    await capturedStorage.setItem('test-key', 'test-value');
    expect(mockSet).toHaveBeenCalledWith('test-key', 'test-value');

    // Test removeItem - this calls the arrow function on line 45
    await capturedStorage.removeItem('test-key');
    expect(mockDel).toHaveBeenCalledWith('test-key');

    resetQueryClient();
    Object.defineProperty(Platform, 'OS', { value: original });
    if (originalWindow === undefined) {
      delete globalRef.window;
    } else {
      globalRef.window = originalWindow;
    }
  });
});
