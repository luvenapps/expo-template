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

const loadStorageModule = (os: 'web' | 'ios') => {
  let storageModule: typeof import('@/auth/storage') | null = null;
  jest.resetModules();
  jest.doMock('react-native', () => ({
    Platform: { OS: os },
  }));
  jest.isolateModules(() => {
    storageModule = require('@/auth/storage');
  });
  return storageModule as unknown as typeof import('@/auth/storage');
};

describe('auth/storage', () => {
  const originalLocalStorage = globalThis.localStorage;

  beforeEach(() => {
    jest.clearAllMocks();
    setGlobalLocalStorage(originalLocalStorage);
  });

  afterAll(() => {
    setGlobalLocalStorage(originalLocalStorage);
  });

  it('uses localStorage on web', async () => {
    const localStorageMock = createLocalStorageMock();
    setGlobalLocalStorage(localStorageMock as unknown as Storage);
    const { supabaseAuthStorage } = loadStorageModule('web');

    await supabaseAuthStorage.setItem('key', 'value');
    const value = await supabaseAuthStorage.getItem('key');
    await supabaseAuthStorage.removeItem('key');

    expect(localStorageMock.setItem).toHaveBeenCalledWith('key', 'value');
    expect(localStorageMock.getItem).toHaveBeenCalledWith('key');
    expect(value).toBe('value');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('key');
  });

  it('returns null on web when localStorage is unavailable', async () => {
    setGlobalLocalStorage(undefined);
    const { supabaseAuthStorage } = loadStorageModule('web');

    const value = await supabaseAuthStorage.getItem('missing');

    expect(value).toBeNull();
  });

  it('swallows localStorage errors on web', async () => {
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
    const { supabaseAuthStorage } = loadStorageModule('web');

    await expect(supabaseAuthStorage.getItem('key')).resolves.toBeNull();
    await expect(supabaseAuthStorage.setItem('key', 'value')).resolves.toBeUndefined();
    await expect(supabaseAuthStorage.removeItem('key')).resolves.toBeUndefined();
  });

  it('uses SecureStore on native', async () => {
    // Mock SecureStore before loading the module in isolation
    const mockSecureStore = {
      getItemAsync: jest.fn(() => Promise.resolve(null)),
      setItemAsync: jest.fn(() => Promise.resolve()),
      deleteItemAsync: jest.fn(() => Promise.resolve()),
    };

    jest.resetModules();
    jest.doMock('react-native', () => ({
      Platform: { OS: 'ios' },
    }));
    jest.doMock('expo-secure-store', () => mockSecureStore);

    let storageModule: typeof import('@/auth/storage') | null = null;
    jest.isolateModules(() => {
      storageModule = require('@/auth/storage');
    });
    const { supabaseAuthStorage } = storageModule as unknown as typeof import('@/auth/storage');

    await supabaseAuthStorage.setItem('key', 'value');
    await supabaseAuthStorage.getItem('key');
    await supabaseAuthStorage.removeItem('key');

    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('key', 'value');
    expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith('key');
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('key');
  });
});
