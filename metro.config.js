const { getDefaultConfig } = require('expo/metro-config');
const { withTamagui } = require('@tamagui/metro-plugin');

// Start from Expo's recommended defaults
const config = getDefaultConfig(__dirname);

module.exports = withTamagui(config, {
  config: './tamagui.config.ts',
});
