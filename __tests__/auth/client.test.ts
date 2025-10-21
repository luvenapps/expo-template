const mockCreateClient = jest.fn();
const mockWarn = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateClient,
}));

// Mock console.warn to verify warning message
global.console.warn = mockWarn;

import { describe, expect, test, beforeEach, jest } from '@jest/globals';

describe('supabase client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockCreateClient.mockReturnValue({
      auth: {
        getSession: jest.fn(),
        onAuthStateChange: jest.fn(),
      },
    });
  });

  test('creates client with env credentials', () => {
    jest.mock('expo-constants', () => ({
      expoConfig: {
        extra: {
          supabaseUrl: 'https://test.supabase.co',
          supabaseAnonKey: 'test-anon-key',
        },
      },
    }));

    // Re-import to get fresh module with mocked constants
    jest.isolateModules(() => {
      require('@/auth/client');
      expect(mockCreateClient).toHaveBeenCalledWith('https://test.supabase.co', 'test-anon-key', {
        auth: {
          persistSession: true,
          storageKey: 'betterhabits-supabase-session',
        },
      });
    });
  });

  test('warns when credentials are missing', () => {
    jest.mock('expo-constants', () => ({
      expoConfig: {
        extra: {},
      },
    }));

    // Re-import to trigger the warning
    jest.isolateModules(() => {
      require('@/auth/client');
      expect(mockWarn).toHaveBeenCalledWith('Supabase credentials are not configured.');
    });
  });

  test('creates client with empty strings when credentials are undefined', () => {
    jest.mock('expo-constants', () => ({
      expoConfig: {
        extra: {},
      },
    }));

    jest.isolateModules(() => {
      require('@/auth/client');
      expect(mockCreateClient).toHaveBeenCalledWith('', '', {
        auth: {
          persistSession: true,
          storageKey: 'betterhabits-supabase-session',
        },
      });
    });
  });
});
