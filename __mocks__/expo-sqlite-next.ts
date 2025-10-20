export const openDatabaseSync = jest.fn(() => ({
  execSync: jest.fn(),
  getFirstSync: jest.fn(),
  getAllSync: jest.fn().mockResolvedValue([]),
  runSync: jest.fn(),
  prepareSync: jest.fn(() => ({
    executeSync: jest.fn(),
    finalizeSync: jest.fn(),
  })),
  closeSync: jest.fn(),
}));

export const deleteDatabaseSync = jest.fn();
