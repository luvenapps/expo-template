// Suppress console warnings in tests
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  const message = args[0];
  if (typeof message === 'string') {
    // Suppress expo-notifications warning about Expo Go SDK 53
    if (message.includes('expo-notifications') && message.includes('SDK 53')) {
      return;
    }
    // Suppress sync platform warning in tests (tests run in jsdom/node environment)
    if (message.includes('Sync is not supported on web platform')) {
      return;
    }
    // Suppress Firebase analytics warnings in tests (native modules unavailable)
    if (message.includes('[Firebase]')) {
      return;
    }
  }
  originalWarn(...args);
};

// Mock feature flags types to include test flag
jest.mock('@/featureFlags/types', () => {
  const actual = jest.requireActual('@/featureFlags/types');
  return {
    ...actual,
    DEFAULT_FLAGS: {
      test_feature_flag: false,
      min_app_version: '',
      prompt_app_version: '',
    },
  };
});

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
      version: '1.0.0',
      extra: {
        supabaseUrl: 'https://test.supabase.co',
        supabaseAnonKey: 'test-anon-key',
        storeIds: {
          ios: '1234567890',
          android: 'com.example.test',
        },
      },
    },
    nativeAppVersion: '1.0.0',
  },
}));

// Mock expo-sqlite to avoid native module errors in tests
const mockDatabase = {
  execSync: jest.fn(),
  runSync: jest.fn(),
  getAllSync: jest.fn(() => []),
  getFirstSync: jest.fn(),
  closeSync: jest.fn(),
  withTransactionSync: jest.fn((callback?: () => void) => {
    callback?.();
  }),
};

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => mockDatabase),
  openDatabaseAsync: jest.fn(() => Promise.resolve(mockDatabase)),
}));
jest.mock('expo-background-task', () => ({
  registerTaskAsync: jest.fn().mockResolvedValue(undefined),
  unregisterTaskAsync: jest.fn().mockResolvedValue(undefined),
  getStatusAsync: jest.fn().mockResolvedValue(1),
  BackgroundTaskStatus: {
    Available: 1,
    Restricted: 2,
  },
  BackgroundTaskResult: {
    Success: 1,
    Failed: 2,
  },
}));

jest.mock('expo-task-manager', () => ({
  registerTaskAsync: jest.fn().mockResolvedValue(undefined),
  unregisterTaskAsync: jest.fn().mockResolvedValue(undefined),
  isTaskDefined: jest.fn(() => false),
}));

// Mock Toast to prevent state updates during tests
jest.mock('@/ui/components/Toast', () => ({
  useToast: () => ({
    messages: [],
    show: jest.fn(() => ''),
    dismiss: jest.fn(),
    clear: jest.fn(),
  }),
  ToastContainer: () => null,
}));

// Mock SoftPromptModal to prevent Tamagui theme issues in tests
jest.mock('@/ui/components/SoftPromptModal', () => ({
  SoftPromptModal: () => null,
}));

// Mock expo-linking to provide useURL hook
jest.mock('expo-linking', () => ({
  ...jest.requireActual('expo-linking'),
  useURL: jest.fn(() => null),
  openURL: jest.fn(() => Promise.resolve()),
}));

const mockSecureStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn((key: string) => Promise.resolve(mockSecureStore.get(key) ?? null)),
  setItemAsync: jest.fn((key: string, value: string) => {
    mockSecureStore.set(key, value);
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key: string) => {
    mockSecureStore.delete(key);
    return Promise.resolve();
  }),
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});
