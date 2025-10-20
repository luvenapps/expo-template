module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  watchman: false,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  reporters: [
    'default',
    [
      'jest-junit',
      {
        classNameTemplate: '{filepath}',
      },
    ],
  ],
  testPathIgnorePatterns: ['<rootDir>/.github/runner/_'],
  modulePathIgnorePatterns: ['<rootDir>/.github/runner/_'],
  collectCoverageFrom: ['{src,app}/**/*.{ts,tsx}', '!**/*.d.ts'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
