const { getDefaultConfig } = require('expo/metro-config');
const { withTamagui } = require('@tamagui/metro-plugin');

// Start from Expo's recommended defaults
const config = getDefaultConfig(__dirname);

// Enable WebAssembly support for expo-sqlite on web
config.resolver.assetExts.push('wasm');

module.exports = withTamagui(config, {
  config: './tamagui.config.ts',
});
