import type { PostgrestError } from '@supabase/supabase-js';

export const DEFAULT_STALE_TIME = 5 * 60 * 1000; // 5 minutes
export const DEFAULT_GC_TIME = 10 * 60 * 1000; // 10 minutes

export function requireUserId(userId: string | null | undefined) {
  if (!userId) {
    throw new Error('A user id is required to perform this operation.');
  }

  return userId;
}

export function mapSupabaseError(error: PostgrestError, fallbackMessage: string) {
  return new Error(error.message || fallbackMessage);
}
