import { DOMAIN } from '@/config/domain.config';
import { Platform } from 'react-native';

type SqliteModule = {
  openDatabaseAsync: typeof import('expo-sqlite').openDatabaseAsync;
};

let sqliteModuleOverride: SqliteModule | null = null;

/**
 * Internal helper exposed for tests to override the SQLite loader.
 */
export function __setDbMetricsSqliteModule(module?: SqliteModule | null) {
  sqliteModuleOverride = module ?? null;
}

async function loadSqliteModule(): Promise<SqliteModule> {
  if (sqliteModuleOverride) {
    return sqliteModuleOverride;
  }

  /* istanbul ignore next - dynamic import not testable in Jest without VM modules */
  return import('expo-sqlite');
}

export type DatabaseMetrics = {
  sizeBytes: number;
  sizeMB: number;
  timestamp: string;
};

export type QueryTiming = {
  durationMs: number;
  queryName?: string;
};

export async function getDatabaseSizeMetrics(): Promise<DatabaseMetrics | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  const sqlite = await loadSqliteModule();
  const handle = await sqlite.openDatabaseAsync(DOMAIN.app.database);

  const sizeResult = handle.getFirstSync<{ size: number }>(
    'SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()',
  );

  const sizeBytes = sizeResult?.size ?? 0;
  return {
    sizeBytes,
    sizeMB: sizeBytes / (1024 * 1024),
    timestamp: new Date().toISOString(),
  };
}

export async function benchmarkQuery<T>(
  query: () => Promise<T>,
  name?: string,
): Promise<{
  result: T;
  timing: QueryTiming;
}> {
  const start = performance.now();
  const result = await query();
  const durationMs = performance.now() - start;
  return {
    result,
    timing: {
      durationMs,
      queryName: name,
    },
  };
}
