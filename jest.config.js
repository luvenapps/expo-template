module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/__tests__/scripts/**/*.test.js',
    '<rootDir>/__tests__/scripts/**/*.test.ts',
  ],
  transform: {
    '^.+\\.tsx?$': [
      'babel-jest',
      {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          '@babel/preset-typescript',
        ],
      },
    ],
  },
};
