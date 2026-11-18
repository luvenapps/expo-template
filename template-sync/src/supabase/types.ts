/* istanbul ignore file */
import { deviceEntity, entryEntity, primaryEntity, reminderEntity } from '@/db/sqlite';

export type PrimaryEntityRecord = typeof primaryEntity.$inferInsert;
export type EntryRecord = typeof entryEntity.$inferInsert;
export type ReminderRecord = typeof reminderEntity.$inferInsert;
export type DeviceRecord = typeof deviceEntity.$inferInsert;
