import path from 'path';

jest.mock('expo/metro-config', () => ({
  getDefaultConfig: () => ({ resolver: { assetExts: ['png'], resolveRequest: null } }),
}));
jest.mock('@tamagui/metro-plugin', () => ({ withTamagui: (config: unknown) => config }));
jest.mock('metro-cache', () => ({
  FileStore: jest.fn((mockOptions: unknown) => ({ options: mockOptions })),
}));

describe('Tamagui compiler configuration', () => {
  const originalCache = process.env.METRO_CACHE_PATH;
  afterEach(() => {
    if (originalCache === undefined) delete process.env.METRO_CACHE_PATH;
    else process.env.METRO_CACHE_PATH = originalCache;
    jest.resetModules();
  });

  it('preserves SQLite WASM assets and resolves project aliases', () => {
    delete process.env.METRO_CACHE_PATH;
    const config = require('../../metro.config');
    expect(config.resolver.assetExts).toContain('wasm');
    expect(config.cacheStores).toBeUndefined();
    const resolveRequest = jest.fn((_context, target) => target);
    const context = { resolveRequest };
    expect(config.resolver.resolveRequest(context, '@/ui/icons', 'ios')).toBe(
      path.resolve(__dirname, '../../src/ui/icons'),
    );
    expect(config.resolver.resolveRequest(context, 'react', 'ios')).toBe('react');
  });

  it('uses the requested Metro cache directory', () => {
    process.env.METRO_CACHE_PATH = '/tmp/template-metro-test';
    const config = require('../../metro.config');
    expect(config.cacheStores[0].options).toEqual({ root: '/tmp/template-metro-test' });
  });

  it('uses the Metro compiler configuration without the old Babel plugin', () => {
    const api = { cache: jest.fn() };
    const babel = require('../../babel.config')(api);
    expect(babel.plugins).toEqual(['react-native-reanimated/plugin']);
    expect(require('../../tamagui.build').default).toEqual({
      disable: true,
      config: './tamagui.config.ts',
      components: ['tamagui'],
    });
  });
});
