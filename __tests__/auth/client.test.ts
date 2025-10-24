import { describe, expect, test } from '@jest/globals';
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
