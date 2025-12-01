import type { PostgrestError } from '@supabase/supabase-js';

import { QUERY_CACHE } from '@/config/constants';

export const DEFAULT_STALE_TIME = QUERY_CACHE.staleTimeMs;
export const DEFAULT_GC_TIME = QUERY_CACHE.gcTimeMs;

export function requireUserId(userId: string | null | undefined) {
  if (!userId) {
    throw new Error('A user id is required to perform this operation.');
  }

  return userId;
}

export function mapSupabaseError(error: PostgrestError, fallbackMessage: string) {
  return new Error(error.message || fallbackMessage);
}
