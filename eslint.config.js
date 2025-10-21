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

  // Custom rules
  {
    rules: {
      'import/no-unresolved': ['error', { ignore: ['expo-sqlite/next', '@supabase/supabase-js'] }],
    },
  },
  // Jest globals for test files
  {
    files: ['**/*.test.{js,jsx,ts,tsx}', '**/*.spec.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: {
        jest: 'readonly',
        describe: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
      },
    },
    rules: {
      'import/first': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]);
