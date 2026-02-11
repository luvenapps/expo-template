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

describe('metro.config', () => {
  it('adds wasm support without overriding resolveRequest', () => {
    const config = require('../metro.config');

    expect(config.resolver.assetExts).toContain('wasm');
    expect(config.resolver.resolveRequest).toBeUndefined();
  });
});
