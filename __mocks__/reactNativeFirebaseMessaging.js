/* eslint-env jest */
const AuthorizationStatus = {
  AUTHORIZED: 1,
  PROVISIONAL: 2,
  DENIED: 3,
};

const requestPermission = jest.fn(() => AuthorizationStatus.AUTHORIZED);
const getToken = jest.fn(() => 'mock-token');

module.exports = {
  __esModule: true,
  default: jest.fn(() => ({
    requestPermission,
    getToken,
  })),
  __mock: {
    requestPermission,
    getToken,
    AuthorizationStatus,
  },
  AuthorizationStatus,
};
