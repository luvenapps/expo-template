import { Platform } from 'react-native';
import { and, isNotNull, lt } from 'drizzle-orm';
import { getDb } from '@/db/sqlite/client';
import { primaryEntity, entryEntity, reminderEntity, deviceEntity } from '@/db/sqlite/schema';

const TABLES = [primaryEntity, entryEntity, reminderEntity, deviceEntity];

export async function cleanupSoftDeletedRecords(options: { olderThanDays?: number } = {}) {
  if (Platform.OS === 'web') {
    return 0;
  }

  const days = options.olderThanDays ?? 90;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const db = await getDb();
  let removed = 0;

  for (const table of TABLES) {
    const deletedAt = (table as any).deletedAt;
    if (!deletedAt) continue;
    const result = await db.delete(table).where(and(isNotNull(deletedAt), lt(deletedAt, cutoff)));
    const count =
      typeof (result as { rowsAffected?: number }).rowsAffected === 'number'
        ? (result as { rowsAffected?: number }).rowsAffected!
        : 0;
    removed += count;
  }

  return removed;
}
