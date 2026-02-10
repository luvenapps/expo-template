const { getDefaultConfig } = require('expo/metro-config');
const { withTamagui } = require('@tamagui/metro-plugin');
const path = require('path');
const { resolve } = require('metro-resolver');

// Start from Expo's recommended defaults
const config = getDefaultConfig(__dirname);

// Enable WebAssembly support for expo-sqlite on web
config.resolver.assetExts.push('wasm');

const defaultResolveRequest = config.resolver.resolveRequest;
const reanimatedEntry = path.join(
  __dirname,
  'node_modules/react-native-reanimated/lib/module/index.js',
);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native-reanimated') {
    return resolve(context, reanimatedEntry, platform);
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }

  return resolve(context, moduleName, platform);
};

module.exports = withTamagui(config, {
  config: './tamagui.config.ts',
});
