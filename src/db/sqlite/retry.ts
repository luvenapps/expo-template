import { resetDatabase } from './client';

const STALE_HANDLE_PATTERNS = [
  'NativeDatabase.prepareSync',
  'database is closed',
  'NullPointerException',
];

function isStaleHandleError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message ?? '';
  return STALE_HANDLE_PATTERNS.some((pattern) => message.includes(pattern));
}

export async function withDatabaseRetry<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!isStaleHandleError(error)) {
      throw error;
    }

    console.warn('[SQLite] Encountered stale handle. Resetting database and retrying…');
    await resetDatabase();
    try {
      return await operation();
    } catch (secondError) {
      console.error('[SQLite] Operation failed again after database reset:', secondError);
      throw secondError;
    }
  }
}
