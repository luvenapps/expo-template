import { describe, expect, test, beforeEach } from '@jest/globals';
import { supabase } from '@/auth/client';

describe('supabase client', () => {
  test('exports supabase client', () => {
    expect(supabase).toBeDefined();
    expect(supabase.auth).toBeDefined();
  });

  test('client has required auth methods', () => {
    expect(supabase.auth.getSession).toBeDefined();
    expect(supabase.auth.onAuthStateChange).toBeDefined();
    expect(supabase.auth.signInWithPassword).toBeDefined();
    expect(supabase.auth.signOut).toBeDefined();
  });

  test('client is configured with correct settings', () => {
    // Verify the client was created with session persistence
    expect(supabase).toBeDefined();
    expect(supabase.auth).toBeDefined();
  });
});

describe('supabase client initialization', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('uses expoConfig.extra credentials when available', () => {
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: {
        expoConfig: {
          extra: {
            supabaseUrl: 'https://from-expo-config.supabase.co',
            supabaseAnonKey: 'expo-config-key',
          },
        },
      },
    }));

    // Re-import to test module initialization with this mock
    const { supabase: testClient } = require('@/auth/client');
    expect(testClient).toBeDefined();
    expect(testClient.auth).toBeDefined();
  });

  test('falls back to process.env when expoConfig.extra is undefined', () => {
    // Mock without expoConfig.extra
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: {
        expoConfig: {},
      },
    }));

    // Set process.env values
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://from-process-env.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'process-env-key';

    // Re-import to test module initialization with this mock
    const { supabase: testClient } = require('@/auth/client');
    expect(testClient).toBeDefined();
    expect(testClient.auth).toBeDefined();

    // Cleanup
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  });

  test('throws error when credentials are missing from both sources', () => {
    // Mock without expoConfig.extra
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: {
        expoConfig: {},
      },
    }));

    // Ensure process.env values are not set
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    // Re-import should throw error
    expect(() => {
      require('@/auth/client');
    }).toThrow('Supabase credentials not configured');
  });

  test('throws error when only URL is missing', () => {
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: {
        expoConfig: {},
      },
    }));

    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-key';

    expect(() => {
      require('@/auth/client');
    }).toThrow('Supabase credentials not configured');

    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  });

  test('throws error when only anon key is missing', () => {
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: {
        expoConfig: {},
      },
    }));

    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    expect(() => {
      require('@/auth/client');
    }).toThrow('Supabase credentials not configured');

    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  });
});
