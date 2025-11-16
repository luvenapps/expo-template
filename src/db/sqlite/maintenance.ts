import { DOMAIN } from '@/config/domain.config';
import { Platform } from 'react-native';
import { openDatabaseAsync } from 'expo-sqlite';

type OptimizeResult = {
  vacuumed: boolean;
  optimized: boolean;
  pragmas: boolean;
};

type OptimizeOptions = {
  vacuum?: boolean;
  pragmas?: boolean;
};

/**
 * Runs VACUUM / PRAGMA optimizations to keep the SQLite file compact.
 * Can be triggered manually (Settings) or after cleanup/archive jobs.
 */
export async function optimizeDatabase(options: OptimizeOptions = {}): Promise<OptimizeResult> {
  if (Platform.OS === 'web') {
    return { vacuumed: false, optimized: false, pragmas: false };
  }

  const handle = await openDatabaseAsync(DOMAIN.app.database);

  const shouldVacuum = options.vacuum ?? true;
  const shouldRunPragmas = options.pragmas ?? true;

  if (shouldRunPragmas) {
    await handle.execAsync('PRAGMA journal_mode=WAL');
    await handle.execAsync('PRAGMA synchronous=NORMAL');
    await handle.execAsync('PRAGMA wal_autocheckpoint=100');
  }

  if (shouldVacuum) {
    await handle.execAsync('VACUUM');
  }

  await handle.execAsync('PRAGMA optimize');

  return {
    vacuumed: shouldVacuum,
    pragmas: shouldRunPragmas,
    optimized: true,
  };
}
