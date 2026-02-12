jest.mock('expo/metro-config', () => ({
  getDefaultConfig: jest.fn(() => ({
    resolver: {
      assetExts: ['png'],
    },
  })),
}));

jest.mock('@tamagui/metro-plugin', () => ({
  withTamagui: jest.fn((config) => config),
}));

jest.mock('metro-cache', () => ({
  FileStore: jest.fn().mockImplementation((opts) => ({ opts })),
}));

describe('metro.config', () => {
  const originalMetroCachePath = process.env.METRO_CACHE_PATH;

  beforeEach(() => {
    jest.resetModules();
    delete process.env.METRO_CACHE_PATH;
  });

  afterAll(() => {
    if (originalMetroCachePath === undefined) {
      delete process.env.METRO_CACHE_PATH;
    } else {
      process.env.METRO_CACHE_PATH = originalMetroCachePath;
    }
  });

  it('adds wasm support without overriding resolveRequest', () => {
    const config = require('../metro.config');

    expect(config.resolver.assetExts).toContain('wasm');
    expect(config.resolver.resolveRequest).toBeUndefined();
  });

  it('uses isolated cache store when METRO_CACHE_PATH is provided', () => {
    process.env.METRO_CACHE_PATH = '.metro-cache-ci';

    const config = require('../metro.config');

    expect(config.cacheStores).toHaveLength(1);
    expect(config.cacheStores?.[0]).toEqual({
      opts: {
        root: expect.stringMatching(/\.metro-cache-ci$/),
      },
    });
  });
});
