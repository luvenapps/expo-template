// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const fs = require('fs');

// Dynamically load .gitignore patterns
const gitignorePatterns = fs
  .readFileSync('.gitignore', 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'));

module.exports = defineConfig([
  // Use .gitignore patterns for ESLint ignore
  { ignores: gitignorePatterns },

  // Existing Expo base config
  expoConfig,
]);
