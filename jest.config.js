module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/__tests__/setup.ts'],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  watchman: false,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^expo-sqlite/next$': '<rootDir>/__mocks__/expo-sqlite-next.ts',
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
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
