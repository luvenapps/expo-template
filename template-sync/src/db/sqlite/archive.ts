import { DATABASE } from '@/config/constants';
import { getDb } from '@/db/sqlite/client';
import { entryEntity } from '@/db/sqlite/schema';
import { and, isNull, lt } from 'drizzle-orm';
import { Platform } from 'react-native';

export async function archiveOldEntries(options: { olderThanDays?: number } = {}) {
  if (Platform.OS === 'web') {
    return 0;
  }

  const days = options.olderThanDays !== undefined ? options.olderThanDays : DATABASE.archiveDays;
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const db = await getDb();
  const now = new Date().toISOString();

  const result = await db
    .update(entryEntity)
    .set({ deletedAt: now })
    .where(and(isNull(entryEntity.deletedAt), lt(entryEntity.date, cutoffDate)));

  const affected =
    typeof (result as { rowsAffected?: number }).rowsAffected === 'number'
      ? (result as { rowsAffected?: number }).rowsAffected!
      : 0;

  return affected;
}
