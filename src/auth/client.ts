import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { DOMAIN } from '@/config/domain.config';

const SUPABASE_URL =
  Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Supabase credentials not configured.\n\n' +
      'Please add the following to your .env.local file:\n' +
      'EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co\n' +
      'EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key\n\n' +
      'Get these from: https://supabase.com/dashboard/project/_/settings/api',
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    storageKey: DOMAIN.app.storageKey,
  },
});
