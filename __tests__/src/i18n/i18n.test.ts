describe('i18n', () => {
  // Suppress console logs from logger and i18n warnings
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

  afterEach(() => {
    jest.resetModules();
    jest.dontMock('react-native-mmkv');
    jest.dontMock('expo-localization');
    logSpy.mockClear();
    infoSpy.mockClear();
    warnSpy.mockClear();
  });

  afterAll(() => {
    logSpy.mockRestore();
    infoSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('initializes with fallback language and returns strings', () => {
    const mod = require('@/i18n') as typeof import('@/i18n');
    expect(mod.default.isInitialized).toBe(true);
    expect(mod.default.t('common.settings')).toBeDefined();
  });

  it('changes language and returns a translation string', () => {
    const mod = require('@/i18n') as typeof import('@/i18n');
    mod.setLanguage('en');
    expect(mod.default.t('common.settings')).toBeTruthy();
    mod.setLanguage('es');
    expect(mod.default.t('common.settings')).toBeTruthy();
  });

  it('falls back to key when missing', () => {
    const mod = require('@/i18n') as typeof import('@/i18n');
    mod.setLanguage('es');
    expect(mod.default.t('nonexistent.key')).toBe('nonexistent.key');
  });

  it('loads stored language on web from localStorage', () => {
    const { DOMAIN } = require('@/config/domain.config');
    const key = `${DOMAIN.app.storageKey}-language`;
    const getItem = jest.fn(() => 'es');
    const store: Record<string, string> = {};
    const mockI18n = require('i18next');
    mockI18n.isInitialized = false;
    mockI18n.language = 'en';
    mockI18n.__lastInitConfig = null;
    jest.doMock('react-native', () => ({ Platform: { OS: 'web' } }));
    (globalThis as any).localStorage = {
      getItem,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: () => undefined,
      clear: () => undefined,
      key: () => null,
      length: 0,
    };

    jest.isolateModules(() => {
      const mod = require('@/i18n') as typeof import('@/i18n');
      mod.initializeI18n();
      expect(getItem).toHaveBeenCalledWith(key);
    });
  });

  it('persists language on web when setLanguage is called', () => {
    const { DOMAIN } = require('@/config/domain.config');
    const key = `${DOMAIN.app.storageKey}-language`;
    const store: Record<string, string> = {};
    const originalPlatform = require('react-native').Platform.OS;
    Object.defineProperty(require('react-native').Platform, 'OS', {
      value: 'web',
      configurable: true,
    });
    (globalThis as any).localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: () => undefined,
      clear: () => undefined,
      key: () => null,
      length: 0,
    };

    const mod = require('@/i18n') as typeof import('@/i18n');
    mod.setLanguage('es');
    expect(store[key]).toBe('es');

    Object.defineProperty(require('react-native').Platform, 'OS', {
      value: originalPlatform,
      configurable: true,
    });
  });

  it('persists language on native via MMKV', () => {
    const originalPlatform = require('react-native').Platform.OS;
    Object.defineProperty(require('react-native').Platform, 'OS', {
      value: 'ios',
      configurable: true,
    });
    const mockI18n = require('i18next');
    mockI18n.isInitialized = false;
    mockI18n.language = 'en';
    const setMock = jest.fn();
    jest.doMock('react-native-mmkv', () => ({
      MMKV: jest.fn().mockImplementation(() => ({
        set: setMock,
        getString: jest.fn(),
      })),
    }));

    jest.isolateModules(() => {
      const mod = require('@/i18n') as typeof import('@/i18n');
      mod.setLanguage('es');
      expect(setMock).toHaveBeenCalled();
    });

    Object.defineProperty(require('react-native').Platform, 'OS', {
      value: originalPlatform,
      configurable: true,
    });
  });

  it('uses device language when no stored preference', () => {
    jest.doMock('react-native', () => ({ Platform: { OS: 'android' } }));
    const mockI18n = require('i18next');
    mockI18n.isInitialized = false;
    mockI18n.language = 'en';
    jest.doMock('expo-localization', () => ({
      getLocales: () => [{ languageCode: 'fr', languageTag: 'fr-FR' }],
    }));

    jest.isolateModules(() => {
      const mod = require('@/i18n') as typeof import('@/i18n');
      expect(mod.default.language?.startsWith('fr')).toBe(true);
    });
  });
});
