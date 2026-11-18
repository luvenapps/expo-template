// commitlint.config.js

/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  // Use the conventional commit rules (feat, fix, chore, docs, etc.)
  extends: ['@commitlint/config-conventional'],
  rules: {
    'body-max-line-length': [0, 'always'], // disable the rule
  },
};
