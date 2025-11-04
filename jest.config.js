module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/__tests__/setup.ts'],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  watchman: false,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^uuid$': '<rootDir>/__mocks__/uuid.ts',
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
  testPathIgnorePatterns: ['<rootDir>/.github/runner/_', '<rootDir>/__tests__/setup.ts'],
  modulePathIgnorePatterns: ['<rootDir>/.github/runner/_'],
  collectCoverageFrom: ['{src,app}/**/*.{ts,tsx}', '!**/*.d.ts'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    // Exclude queries until UI is implemented (see roadmap Stage 7)
    // TODO: Remove this exclusion when habit tracking UI is built
    '<rootDir>/src/queries/',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
