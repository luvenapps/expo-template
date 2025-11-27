module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/__tests__/setup.ts'],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  watchman: false,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^uuid$': '<rootDir>/__mocks__/uuid.ts',
    '^@react-native-firebase/messaging$': '<rootDir>/__mocks__/reactNativeFirebaseMessaging.js',
    '^i18next$': '<rootDir>/__mocks__/i18next.js',
    '^react-i18next$': '<rootDir>/__mocks__/reactI18next.js',
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
    // TODO: Remove this exclusion when the UI is built
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
