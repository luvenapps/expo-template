const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    ignores: ['template-sync/**', 'node_modules/**', 'coverage/**'],
  },
  js.configs.recommended,
  {
    files: ['scripts/**/*.mjs', '.github/scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      'no-console': 'off',
    },
  },
];
