import { DOMAIN } from '@/config/domain.config';

const STORAGE_KEY = `${DOMAIN.app.storageKey}-local-name`;

const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
  };
};

const setGlobalLocalStorage = (value: Storage | undefined) => {
  Object.defineProperty(globalThis, 'localStorage', {
    value,
    configurable: true,
  });
};

const loadNameStorageModule = (os: 'web' | 'ios') => {
  let storageModule: typeof import('@/auth/nameStorage') | null = null;
  jest.resetModules();
  jest.doMock('react-native', () => ({
    Platform: { OS: os },
  }));
  jest.isolateModules(() => {
    storageModule = require('@/auth/nameStorage');
  });
  return storageModule as unknown as typeof import('@/auth/nameStorage');
};

describe('auth/nameStorage', () => {
  const originalLocalStorage = globalThis.localStorage;

  beforeEach(() => {
    jest.clearAllMocks();
    setGlobalLocalStorage(originalLocalStorage);
  });

  afterAll(() => {
    setGlobalLocalStorage(originalLocalStorage);
  });

  it('uses localStorage on web', () => {
    const localStorageMock = createLocalStorageMock();
    setGlobalLocalStorage(localStorageMock as unknown as Storage);
    const { getLocalName, setLocalName, clearLocalName } = loadNameStorageModule('web');

    setLocalName('  Ada Lovelace  ');
    const value = getLocalName();
    clearLocalName();

    expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, 'Ada Lovelace');
    expect(localStorageMock.getItem).toHaveBeenCalledWith(STORAGE_KEY);
    expect(value).toBe('Ada Lovelace');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
  });

  it('clears localStorage when setLocalName is empty on web', () => {
    const localStorageMock = createLocalStorageMock();
    setGlobalLocalStorage(localStorageMock as unknown as Storage);
    const { setLocalName } = loadNameStorageModule('web');

    setLocalName('   ');

    expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
  });

  it('returns null on web when localStorage is unavailable', () => {
    setGlobalLocalStorage(undefined);
    const { getLocalName } = loadNameStorageModule('web');

    expect(getLocalName()).toBeNull();
  });

  it('swallows localStorage errors on web', () => {
    const localStorageMock = {
      getItem: jest.fn(() => {
        throw new Error('boom');
      }),
      setItem: jest.fn(() => {
        throw new Error('boom');
      }),
      removeItem: jest.fn(() => {
        throw new Error('boom');
      }),
    };
    setGlobalLocalStorage(localStorageMock as unknown as Storage);
    const { getLocalName, setLocalName, clearLocalName } = loadNameStorageModule('web');

    expect(getLocalName()).toBeNull();
    expect(() => setLocalName('Ada')).not.toThrow();
    expect(() => clearLocalName()).not.toThrow();
  });

  it('uses MMKV on native', () => {
    const store = {
      getString: jest.fn(() => 'Grace Hopper'),
      set: jest.fn(),
      delete: jest.fn(),
    };

    jest.resetModules();
    jest.doMock('react-native', () => ({
      Platform: { OS: 'ios' },
    }));
    jest.doMock('react-native-mmkv', () => ({
      createMMKV: jest.fn(() => store),
    }));

    let storageModule: typeof import('@/auth/nameStorage') | null = null;
    jest.isolateModules(() => {
      storageModule = require('@/auth/nameStorage');
    });
    const { getLocalName, setLocalName, clearLocalName } =
      storageModule as unknown as typeof import('@/auth/nameStorage');

    setLocalName('  Grace Hopper ');
    const value = getLocalName();
    clearLocalName();

    expect(store.set).toHaveBeenCalledWith(STORAGE_KEY, 'Grace Hopper');
    expect(store.getString).toHaveBeenCalledWith(STORAGE_KEY);
    expect(value).toBe('Grace Hopper');
    expect(store.delete).toHaveBeenCalledWith(STORAGE_KEY);
  });

  it('handles missing MMKV on native', () => {
    jest.resetModules();
    jest.doMock('react-native', () => ({
      Platform: { OS: 'ios' },
    }));
    jest.doMock('react-native-mmkv', () => {
      throw new Error('no mmkv');
    });

    let storageModule: typeof import('@/auth/nameStorage') | null = null;
    jest.isolateModules(() => {
      storageModule = require('@/auth/nameStorage');
    });
    const { getLocalName, setLocalName, clearLocalName } =
      storageModule as unknown as typeof import('@/auth/nameStorage');

    expect(getLocalName()).toBeNull();
    expect(() => setLocalName('Ada')).not.toThrow();
    expect(() => clearLocalName()).not.toThrow();
  });
});
