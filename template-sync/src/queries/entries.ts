import { supabase } from '@/auth/client';
import { DOMAIN } from '@/config/domain.config';
import { mapPayloadToRemote, normalizePayload } from '@/supabase/mappers';
import { mapRemoteEntryEntities } from '@/supabase/remoteMappers';
import type { EntryRecord } from '@/supabase/types';
import { DEFAULT_GC_TIME, DEFAULT_STALE_TIME, mapSupabaseError, requireUserId } from './utils';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { v4 as uuid } from 'uuid';

const ENTRIES_REMOTE_TABLE = DOMAIN.entities.entries.remoteTableName;
const ENTRIES_LOCAL_TABLE = DOMAIN.entities.entries.tableName;
const ENTRY_FOREIGN_KEY = DOMAIN.entities.entries.foreignKey;
const ENTRY_REMOTE_FOREIGN_KEY = DOMAIN.entities.entries.row_id;

type EntryForeignKey = typeof ENTRY_FOREIGN_KEY;
type ForeignKeyPayload = { [K in EntryForeignKey]: EntryRecord[K] };

const entriesQueryKey = (userId: string | null, primaryId: string | null) =>
  ['remote', ENTRIES_REMOTE_TABLE, userId, primaryId] as const;

type EntriesQueryKey = ReturnType<typeof entriesQueryKey>;

type EntriesQueryOptions = Omit<
  UseQueryOptions<EntryRecord[], Error, EntryRecord[], EntriesQueryKey>,
  'queryKey' | 'queryFn'
>;

type CreateEntryInput = ForeignKeyPayload & {
  date?: string;
  amount?: number;
  source?: string;
};

type UpdateEntryInput = { id: string } & ForeignKeyPayload & {
    date?: string;
    amount?: number;
    source?: string;
    deletedAt?: string | null;
  };

type DeleteEntryInput = { id: string } & ForeignKeyPayload;

export async function fetchEntries(userId: string, primaryId: string) {
  const { data, error } = await supabase
    .from(ENTRIES_REMOTE_TABLE)
    .select('*')
    .eq('user_id', userId)
    .eq(ENTRY_REMOTE_FOREIGN_KEY, primaryId)
    .order('date', { ascending: false });

  if (error) {
    throw mapSupabaseError(error, `Failed to load ${DOMAIN.entities.entries.plural}.`);
  }

  return mapRemoteEntryEntities(data ?? []);
}

export function useEntries(
  userId: string | null,
  primaryId: string | null,
  options?: EntriesQueryOptions,
) {
  return useQuery({
    queryKey: entriesQueryKey(userId, primaryId),
    queryFn: () => fetchEntries(requireUserId(userId), requireUserId(primaryId)),
    enabled: Boolean(userId && primaryId),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
    ...options,
  });
}

export function useCreateEntry(
  userId: string | null,
  options?: UseMutationOptions<EntryRecord, Error, CreateEntryInput>,
) {
  const queryClient = useQueryClient();

  return useMutation<EntryRecord, Error, CreateEntryInput>({
    mutationFn: async (input) => {
      const resolvedUserId = requireUserId(userId);
      const primaryId = input[ENTRY_FOREIGN_KEY];
      const now = new Date().toISOString();

      const record: EntryRecord = {
        id: uuid(),
        userId: resolvedUserId,
        [ENTRY_FOREIGN_KEY]: primaryId,
        date: input.date ?? new Date().toISOString().slice(0, 10),
        amount: input.amount ?? 0,
        source: input.source ?? 'remote',
        createdAt: now,
        updatedAt: now,
        version: 1,
        deletedAt: null,
      };

      const remotePayload = normalizePayload(
        mapPayloadToRemote(ENTRIES_LOCAL_TABLE, record, {
          user_id: resolvedUserId,
          [ENTRY_REMOTE_FOREIGN_KEY]: primaryId,
        }),
      );

      const { data, error } = await supabase
        .from(ENTRIES_REMOTE_TABLE)
        .insert(remotePayload)
        .select()
        .maybeSingle();

      if (error) {
        throw mapSupabaseError(error, `Failed to create ${DOMAIN.entities.entries.displayName}.`);
      }

      const mapped = mapRemoteEntryEntities(data ? [data] : undefined);
      const result = mapped[0] ?? record;

      await queryClient.invalidateQueries({
        queryKey: entriesQueryKey(resolvedUserId, result[ENTRY_FOREIGN_KEY]),
      });

      return result;
    },
    ...options,
  });
}

export function useUpdateEntry(
  userId: string | null,
  options?: UseMutationOptions<EntryRecord, Error, UpdateEntryInput>,
) {
  const queryClient = useQueryClient();

  return useMutation<EntryRecord, Error, UpdateEntryInput>({
    mutationFn: async (input) => {
      const resolvedUserId = requireUserId(userId);
      const now = new Date().toISOString();

      const remotePayload = normalizePayload(
        mapPayloadToRemote(ENTRIES_LOCAL_TABLE, {
          ...input,
          userId: resolvedUserId,
          updatedAt: now,
        }),
      );

      remotePayload[ENTRY_REMOTE_FOREIGN_KEY] = input[ENTRY_FOREIGN_KEY];

      const { data, error } = await supabase
        .from(ENTRIES_REMOTE_TABLE)
        .update(remotePayload)
        .eq('id', input.id)
        .eq('user_id', resolvedUserId)
        .select()
        .maybeSingle();

      if (error) {
        throw mapSupabaseError(error, `Failed to update ${DOMAIN.entities.entries.displayName}.`);
      }

      const mapped = mapRemoteEntryEntities(data ? [data] : undefined);
      const fallback: EntryRecord = {
        id: input.id,
        userId: resolvedUserId,
        [ENTRY_FOREIGN_KEY]: input[ENTRY_FOREIGN_KEY],
        date: input.date ?? new Date().toISOString().slice(0, 10),
        amount: input.amount ?? 0,
        source: input.source ?? 'remote',
        createdAt: now,
        updatedAt: now,
        version: 1,
        deletedAt: input.deletedAt ?? null,
      };

      const result = mapped[0] ?? fallback;

      await queryClient.invalidateQueries({
        queryKey: entriesQueryKey(resolvedUserId, result[ENTRY_FOREIGN_KEY]),
      });

      return result;
    },
    ...options,
  });
}

export function useDeleteEntry(
  userId: string | null,
  options?: UseMutationOptions<string, Error, DeleteEntryInput>,
) {
  const queryClient = useQueryClient();

  return useMutation<string, Error, DeleteEntryInput>({
    mutationFn: async (input) => {
      const resolvedUserId = requireUserId(userId);
      const { id } = input;
      const foreignKeyValue = input[ENTRY_FOREIGN_KEY];

      const { error } = await supabase
        .from(ENTRIES_REMOTE_TABLE)
        .delete()
        .eq('id', id)
        .eq('user_id', resolvedUserId);

      if (error) {
        throw mapSupabaseError(error, `Failed to delete ${DOMAIN.entities.entries.displayName}.`);
      }

      await queryClient.invalidateQueries({
        queryKey: entriesQueryKey(resolvedUserId, foreignKeyValue),
      });

      return id;
    },
    ...options,
  });
}
