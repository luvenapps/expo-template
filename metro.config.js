const { getDefaultConfig } = require('expo/metro-config');
const { withTamagui } = require('@tamagui/metro-plugin');
const { FileStore } = require('metro-cache');
const path = require('path');

// Start from Expo's recommended defaults
const config = getDefaultConfig(__dirname);

if (process.env.METRO_CACHE_PATH) {
  config.cacheStores = [new FileStore({ root: path.resolve(process.env.METRO_CACHE_PATH) })];
}

// Enable WebAssembly support for expo-sqlite on web
config.resolver.assetExts.push('wasm');

module.exports = withTamagui(config, {
  config: './tamagui.config.ts',
});
