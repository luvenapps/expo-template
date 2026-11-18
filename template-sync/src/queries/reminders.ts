import { supabase } from '@/auth/client';
import { DOMAIN } from '@/config/domain.config';
import { mapPayloadToRemote, normalizePayload } from '@/supabase/mappers';
import { mapRemoteReminderEntities } from '@/supabase/remoteMappers';
import type { ReminderRecord } from '@/supabase/types';
import { DEFAULT_GC_TIME, DEFAULT_STALE_TIME, mapSupabaseError, requireUserId } from './utils';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { v4 as uuid } from 'uuid';
import { toSnakeCase } from '@/utils/string';

const REMINDERS_REMOTE_TABLE = DOMAIN.entities.reminders.remoteTableName;
const REMINDERS_LOCAL_TABLE = DOMAIN.entities.reminders.tableName;
const REMINDER_FOREIGN_KEY = DOMAIN.entities.reminders.foreignKey;
const REMINDER_REMOTE_FOREIGN_KEY = toSnakeCase(DOMAIN.entities.reminders.foreignKey);

type ReminderForeignKey = typeof REMINDER_FOREIGN_KEY;
type ForeignKeyPayload = { [K in ReminderForeignKey]: ReminderRecord[K] };

const remindersQueryKey = (userId: string | null, primaryId: string | null) =>
  ['remote', REMINDERS_REMOTE_TABLE, userId, primaryId] as const;

type RemindersQueryKey = ReturnType<typeof remindersQueryKey>;

type RemindersQueryOptions = Omit<
  UseQueryOptions<ReminderRecord[], Error, ReminderRecord[], RemindersQueryKey>,
  'queryKey' | 'queryFn'
>;

type CreateReminderInput = ForeignKeyPayload & {
  timeLocal: string;
  daysOfWeek?: string;
  timezone?: string;
  isEnabled?: boolean;
};

type UpdateReminderInput = { id: string } & ForeignKeyPayload & {
    timeLocal?: string;
    daysOfWeek?: string;
    timezone?: string;
    isEnabled?: boolean;
    deletedAt?: string | null;
  };

type DeleteReminderInput = { id: string } & ForeignKeyPayload;

export async function fetchReminders(userId: string, primaryId: string) {
  const { data, error } = await supabase
    .from(REMINDERS_REMOTE_TABLE)
    .select('*')
    .eq('user_id', userId)
    .eq(REMINDER_REMOTE_FOREIGN_KEY, primaryId)
    .order('time_local', { ascending: true });

  if (error) {
    throw mapSupabaseError(error, `Failed to load ${DOMAIN.entities.reminders.plural}.`);
  }

  return mapRemoteReminderEntities(data ?? []);
}

export function useReminders(
  userId: string | null,
  primaryId: string | null,
  options?: RemindersQueryOptions,
) {
  return useQuery({
    queryKey: remindersQueryKey(userId, primaryId),
    queryFn: () => fetchReminders(requireUserId(userId), requireUserId(primaryId)),
    enabled: Boolean(userId && primaryId),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
    ...options,
  });
}

export function useCreateReminder(
  userId: string | null,
  options?: UseMutationOptions<ReminderRecord, Error, CreateReminderInput>,
) {
  const queryClient = useQueryClient();

  return useMutation<ReminderRecord, Error, CreateReminderInput>({
    mutationFn: async (input) => {
      const resolvedUserId = requireUserId(userId);
      const primaryId = input[REMINDER_FOREIGN_KEY];
      const now = new Date().toISOString();

      const record: ReminderRecord = {
        id: uuid(),
        userId: resolvedUserId,
        [REMINDER_FOREIGN_KEY]: primaryId,
        timeLocal: input.timeLocal,
        daysOfWeek: input.daysOfWeek ?? '',
        timezone: input.timezone ?? 'UTC',
        isEnabled: input.isEnabled ?? true,
        createdAt: now,
        updatedAt: now,
        version: 1,
        deletedAt: null,
      };

      const remotePayload = normalizePayload(
        mapPayloadToRemote(REMINDERS_LOCAL_TABLE, record, {
          user_id: resolvedUserId,
          [REMINDER_REMOTE_FOREIGN_KEY]: primaryId,
        }),
      );

      const { data, error } = await supabase
        .from(REMINDERS_REMOTE_TABLE)
        .insert(remotePayload)
        .select()
        .maybeSingle();

      if (error) {
        throw mapSupabaseError(error, `Failed to create ${DOMAIN.entities.reminders.displayName}.`);
      }

      const mapped = mapRemoteReminderEntities(data ? [data] : undefined);
      const result = mapped[0] ?? record;

      await queryClient.invalidateQueries({
        queryKey: remindersQueryKey(resolvedUserId, result[REMINDER_FOREIGN_KEY]),
      });

      return result;
    },
    ...options,
  });
}

export function useUpdateReminder(
  userId: string | null,
  options?: UseMutationOptions<ReminderRecord, Error, UpdateReminderInput>,
) {
  const queryClient = useQueryClient();

  return useMutation<ReminderRecord, Error, UpdateReminderInput>({
    mutationFn: async (input) => {
      const resolvedUserId = requireUserId(userId);
      const now = new Date().toISOString();

      const remotePayload = normalizePayload(
        mapPayloadToRemote(REMINDERS_LOCAL_TABLE, {
          ...input,
          userId: resolvedUserId,
          updatedAt: now,
        }),
      );

      remotePayload[REMINDER_REMOTE_FOREIGN_KEY] = input[REMINDER_FOREIGN_KEY];

      const { data, error } = await supabase
        .from(REMINDERS_REMOTE_TABLE)
        .update(remotePayload)
        .eq('id', input.id)
        .eq('user_id', resolvedUserId)
        .select()
        .maybeSingle();

      if (error) {
        throw mapSupabaseError(error, `Failed to update ${DOMAIN.entities.reminders.displayName}.`);
      }

      const mapped = mapRemoteReminderEntities(data ? [data] : undefined);
      const fallback: ReminderRecord = {
        id: input.id,
        userId: resolvedUserId,
        [REMINDER_FOREIGN_KEY]: input[REMINDER_FOREIGN_KEY],
        timeLocal: input.timeLocal ?? '09:00',
        daysOfWeek: input.daysOfWeek ?? '',
        timezone: input.timezone ?? 'UTC',
        isEnabled: input.isEnabled ?? true,
        createdAt: now,
        updatedAt: now,
        version: 1,
        deletedAt: input.deletedAt ?? null,
      };

      const result = mapped[0] ?? fallback;

      await queryClient.invalidateQueries({
        queryKey: remindersQueryKey(resolvedUserId, result[REMINDER_FOREIGN_KEY]),
      });

      return result;
    },
    ...options,
  });
}

export function useDeleteReminder(
  userId: string | null,
  options?: UseMutationOptions<string, Error, DeleteReminderInput>,
) {
  const queryClient = useQueryClient();

  return useMutation<string, Error, DeleteReminderInput>({
    mutationFn: async (input) => {
      const resolvedUserId = requireUserId(userId);
      const { id } = input;
      const foreignKeyValue = input[REMINDER_FOREIGN_KEY];

      const { error } = await supabase
        .from(REMINDERS_REMOTE_TABLE)
        .delete()
        .eq('id', id)
        .eq('user_id', resolvedUserId);

      if (error) {
        throw mapSupabaseError(error, `Failed to delete ${DOMAIN.entities.reminders.displayName}.`);
      }

      await queryClient.invalidateQueries({
        queryKey: remindersQueryKey(resolvedUserId, foreignKeyValue),
      });

      return id;
    },
    ...options,
  });
}
