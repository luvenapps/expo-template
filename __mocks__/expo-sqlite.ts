export const openDatabaseAsync = jest.fn(() => ({
  getFirstSync: jest.fn(() => ({ size: 1024 })),
}));
