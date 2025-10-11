const { getDefaultConfig } = require('expo/metro-config');
const { withTamagui } = require('@tamagui/metro-plugin');

const config = getDefaultConfig(__dirname);

module.exports = withTamagui(config, {
  config: './tamagui.config.ts',
});
