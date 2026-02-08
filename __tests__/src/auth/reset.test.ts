import {
  clearPendingRemoteReset,
  deleteRemoteUserData,
  getPendingRemoteReset,
  runPendingRemoteReset,
  setPendingRemoteReset,
} from '@/auth/reset';
import { DOMAIN } from '@/config/domain.config';
import { Platform } from 'react-native';

const mockMmkvStore = new Map<string, string>();
const mockMmkvSet = jest.fn((key: string, value: string) => {
  mockMmkvStore.set(key, value);
});
const mockMmkvGetString = jest.fn((key: string) => mockMmkvStore.get(key));
const mockMmkvDelete = jest.fn((key: string) => {
  mockMmkvStore.delete(key);
});

jest.mock('react-native-mmkv', () => ({
  createMMKV: jest.fn(() => ({
    set: mockMmkvSet,
    getString: mockMmkvGetString,
    delete: mockMmkvDelete,
  })),
}));

jest.mock('@/auth/client', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

function setPlatform(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', {
    value: os,
    configurable: true,
  });
}

function createLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: jest.fn((key: string) => store.get(key) ?? null),
    setItem: jest.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: jest.fn((key: string) => {
      store.delete(key);
    }),
  };
}

describe('auth/reset', () => {
  beforeEach(() => {
    mockMmkvStore.clear();
    mockMmkvSet.mockClear();
    mockMmkvGetString.mockClear();
    mockMmkvDelete.mockClear();
    setPlatform('web');
    Object.defineProperty(globalThis, 'localStorage', {
      value: createLocalStorage(),
      configurable: true,
    });
    const supabase = require('@/auth/client').supabase as any;
    supabase.from.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('stores pending reset flag on web', () => {
    setPendingRemoteReset(true);
    expect(getPendingRemoteReset()).toBe(true);

    clearPendingRemoteReset();
    expect(getPendingRemoteReset()).toBe(false);
  });

  it('writes pending reset flag to localStorage when available', () => {
    setPlatform('web');
    const storage = createLocalStorage();
    Object.defineProperty(globalThis, 'localStorage', {
      value: storage,
      configurable: true,
    });

    setPendingRemoteReset(true);

    expect(storage.setItem).toHaveBeenCalledWith(
      `${DOMAIN.app.storageKey}-pending-remote-reset`,
      '1',
    );
  });

  it('stores pending reset flag on native', () => {
    setPlatform('ios');
    setPendingRemoteReset(true);
    expect(getPendingRemoteReset()).toBe(true);

    clearPendingRemoteReset();
    expect(getPendingRemoteReset()).toBe(false);
  });

  it('clears pending reset flag in localStorage on web', () => {
    setPlatform('web');
    const storage = createLocalStorage();
    Object.defineProperty(globalThis, 'localStorage', {
      value: storage,
      configurable: true,
    });

    clearPendingRemoteReset();

    expect(storage.removeItem).toHaveBeenCalledWith(
      `${DOMAIN.app.storageKey}-pending-remote-reset`,
    );
  });

  it('writes pending reset flag to native store', () => {
    setPlatform('ios');
    setPendingRemoteReset(true);

    expect(mockMmkvSet).toHaveBeenCalledWith(`${DOMAIN.app.storageKey}-pending-remote-reset`, '1');
  });

  it('writes "0" to native store when clearing pending reset', () => {
    setPlatform('ios');
    setPendingRemoteReset(false);

    expect(mockMmkvSet).toHaveBeenCalledWith(`${DOMAIN.app.storageKey}-pending-remote-reset`, '0');
  });

  it('skips native write when MMKV initialization throws', () => {
    setPlatform('ios');
    const mmkvModule = require('react-native-mmkv');
    mmkvModule.createMMKV.mockImplementationOnce(() => {
      throw new Error('MMKV init failed');
    });

    expect(() => setPendingRemoteReset(true)).not.toThrow();
    expect(mockMmkvSet).not.toHaveBeenCalled();
  });

  it('returns false on native when MMKV initialization fails', () => {
    setPlatform('ios');
    const mmkvModule = require('react-native-mmkv');
    mmkvModule.createMMKV.mockImplementationOnce(() => {
      throw new Error('MMKV init failed');
    });

    expect(() => setPendingRemoteReset(true)).not.toThrow();
    expect(getPendingRemoteReset()).toBe(false);
  });

  it('returns false when web storage throws', () => {
    const storage = createLocalStorage();
    storage.getItem.mockImplementation(() => {
      throw new Error('storage blocked');
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: storage,
      configurable: true,
    });

    expect(getPendingRemoteReset()).toBe(false);
  });

  it('returns false when web storage is unavailable', () => {
    setPlatform('web');
    Reflect.deleteProperty(globalThis, 'localStorage');

    expect(getPendingRemoteReset()).toBe(false);
  });

  it('does not throw when setting pending reset without web storage', () => {
    setPlatform('web');
    Reflect.deleteProperty(globalThis, 'localStorage');

    expect(() => setPendingRemoteReset(true)).not.toThrow();
  });

  it('does not throw when clearing pending reset without web storage', () => {
    setPlatform('web');
    Reflect.deleteProperty(globalThis, 'localStorage');

    expect(() => clearPendingRemoteReset()).not.toThrow();
  });

  it('deletes remote user data across tables', async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const deleteMock = jest.fn(() => ({ eq }));
    const supabase = require('@/auth/client').supabase as any;
    supabase.from.mockReturnValue({ delete: deleteMock });

    await deleteRemoteUserData('user-1');

    expect(deleteMock).toHaveBeenCalledTimes(4);
    expect(eq).toHaveBeenCalledTimes(4);
  });

  it('throws when remote delete fails', async () => {
    const eq = jest.fn().mockResolvedValue({ error: new Error('boom') });
    const supabase = require('@/auth/client').supabase as any;
    supabase.from.mockReturnValue({ delete: () => ({ eq }) });

    await expect(deleteRemoteUserData('user-1')).rejects.toThrow('boom');
  });

  it('runs pending remote reset on login and clears flag', async () => {
    const logger = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
    setPendingRemoteReset(true);
    const eq = jest.fn().mockResolvedValue({ error: null });
    const deleteMock = jest.fn(() => ({ eq }));
    const supabase = require('@/auth/client').supabase as any;
    supabase.from.mockReturnValue({ delete: deleteMock });

    await runPendingRemoteReset({ user: { id: 'user-1' } } as any, logger);

    expect(deleteMock).toHaveBeenCalledTimes(4);
    expect(getPendingRemoteReset()).toBe(false);
    expect(logger.info).toHaveBeenCalledWith('Pending remote reset completed');
  });

  it('logs error when pending reset fails', async () => {
    const logger = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
    setPendingRemoteReset(true);
    const failure = new Error('remote failed');
    const eq = jest.fn().mockResolvedValue({ error: failure });
    const supabase = require('@/auth/client').supabase as any;
    supabase.from.mockReturnValue({ delete: () => ({ eq }) });

    await runPendingRemoteReset({ user: { id: 'user-1' } } as any, logger);

    expect(logger.error).toHaveBeenCalledWith('Pending remote reset failed:', failure);
    expect(getPendingRemoteReset()).toBe(true);
  });

  it('skips pending reset when there is no session', async () => {
    const reset = require('@/auth/reset') as typeof import('@/auth/reset');
    const spy = jest.spyOn(reset, 'deleteRemoteUserData').mockResolvedValueOnce(undefined);

    await runPendingRemoteReset(null, undefined);

    expect(spy).not.toHaveBeenCalled();
  });

  it('skips pending reset when flag is not set', async () => {
    const supabase = require('@/auth/client').supabase as any;
    setPendingRemoteReset(false);

    await runPendingRemoteReset({ user: { id: 'user-1' } } as any, undefined);

    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('stores "0" in localStorage when Platform is web and value is false', () => {
    setPlatform('web');
    const storage = createLocalStorage();
    Object.defineProperty(globalThis, 'localStorage', {
      value: storage,
      configurable: true,
    });

    setPendingRemoteReset(false);

    expect(storage.setItem).toHaveBeenCalledWith(
      `${DOMAIN.app.storageKey}-pending-remote-reset`,
      '0',
    );
    expect(getPendingRemoteReset()).toBe(false);
  });
});
