// Mock Supabase globally for all tests
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      signInWithPassword: jest.fn(),
      signInWithOAuth: jest.fn(),
      signOut: jest.fn(),
    },
  })),
}));

// Mock expo-constants to provide Supabase credentials in tests
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        supabaseUrl: 'https://test.supabase.co',
        supabaseAnonKey: 'test-anon-key',
      },
    },
  },
}));

// Mock expo-sqlite to avoid native module errors in tests
const mockDatabase = {
  execSync: jest.fn(),
  runSync: jest.fn(),
  getAllSync: jest.fn(() => []),
  getFirstSync: jest.fn(),
  closeSync: jest.fn(),
};

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => mockDatabase),
  openDatabaseAsync: jest.fn(() => Promise.resolve(mockDatabase)),
}));
