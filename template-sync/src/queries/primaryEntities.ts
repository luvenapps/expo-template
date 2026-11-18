import { supabase } from '@/auth/client';
import { DOMAIN } from '@/config/domain.config';
import { mapPayloadToRemote, normalizePayload } from '@/supabase/mappers';
import { mapRemotePrimaryEntities } from '@/supabase/remoteMappers';
import type { PrimaryEntityRecord } from '@/supabase/types';
import { DEFAULT_GC_TIME, DEFAULT_STALE_TIME, mapSupabaseError, requireUserId } from './utils';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { v4 as uuid } from 'uuid';

const PRIMARY_REMOTE_TABLE = DOMAIN.entities.primary.remoteTableName;
const PRIMARY_LOCAL_TABLE = DOMAIN.entities.primary.tableName;

const primaryEntitiesQueryKey = (userId: string | null) =>
  ['remote', PRIMARY_REMOTE_TABLE, userId] as const;

type PrimaryEntitiesQueryKey = ReturnType<typeof primaryEntitiesQueryKey>;

type PrimaryEntitiesQueryOptions = Omit<
  UseQueryOptions<PrimaryEntityRecord[], Error, PrimaryEntityRecord[], PrimaryEntitiesQueryKey>,
  'queryKey' | 'queryFn'
>;

type CreatePrimaryEntityInput = {
  name: string;
  cadence?: string;
  color?: string;
  sortOrder?: number;
  isArchived?: boolean;
};

type UpdatePrimaryEntityInput = {
  id: string;
  name?: string;
  cadence?: string;
  color?: string;
  sortOrder?: number;
  isArchived?: boolean;
  deletedAt?: string | null;
};

type DeletePrimaryEntityInput = {
  id: string;
};

export async function fetchPrimaryEntities(userId: string) {
  const { data, error } = await supabase
    .from(PRIMARY_REMOTE_TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });

  if (error) {
    throw mapSupabaseError(error, `Failed to load ${DOMAIN.entities.primary.plural}.`);
  }

  return mapRemotePrimaryEntities(data ?? []);
}

export function usePrimaryEntities(userId: string | null, options?: PrimaryEntitiesQueryOptions) {
  return useQuery({
    queryKey: primaryEntitiesQueryKey(userId),
    queryFn: () => fetchPrimaryEntities(requireUserId(userId)),
    enabled: Boolean(userId),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
    ...options,
  });
}

export function useCreatePrimaryEntity(
  userId: string | null,
  options?: UseMutationOptions<PrimaryEntityRecord, Error, CreatePrimaryEntityInput>,
) {
  const queryClient = useQueryClient();

  return useMutation<PrimaryEntityRecord, Error, CreatePrimaryEntityInput>({
    mutationFn: async (input) => {
      const resolvedUserId = requireUserId(userId);
      const now = new Date().toISOString();
      const record: PrimaryEntityRecord = {
        id: uuid(),
        userId: resolvedUserId,
        name: input.name,
        cadence: input.cadence ?? 'daily',
        color: input.color ?? '#ffffff',
        sortOrder: input.sortOrder ?? 0,
        isArchived: input.isArchived ?? false,
        createdAt: now,
        updatedAt: now,
        version: 1,
        deletedAt: null,
      };

      const remotePayload = normalizePayload(
        mapPayloadToRemote(PRIMARY_LOCAL_TABLE, record, { user_id: resolvedUserId }),
      );

      const { data, error } = await supabase
        .from(PRIMARY_REMOTE_TABLE)
        .insert(remotePayload)
        .select()
        .maybeSingle();

      if (error) {
        throw mapSupabaseError(error, `Failed to create ${DOMAIN.entities.primary.displayName}.`);
      }

      const mapped = mapRemotePrimaryEntities(data ? [data] : undefined);
      const result = mapped[0] ?? record;

      await queryClient.invalidateQueries({ queryKey: primaryEntitiesQueryKey(resolvedUserId) });

      return result;
    },
    ...options,
  });
}

export function useUpdatePrimaryEntity(
  userId: string | null,
  options?: UseMutationOptions<PrimaryEntityRecord, Error, UpdatePrimaryEntityInput>,
) {
  const queryClient = useQueryClient();

  return useMutation<PrimaryEntityRecord, Error, UpdatePrimaryEntityInput>({
    mutationFn: async (input) => {
      const resolvedUserId = requireUserId(userId);
      const now = new Date().toISOString();

      const remotePayload = normalizePayload(
        mapPayloadToRemote(PRIMARY_LOCAL_TABLE, {
          ...input,
          userId: resolvedUserId,
          updatedAt: now,
        }),
      );

      const { data, error } = await supabase
        .from(PRIMARY_REMOTE_TABLE)
        .update(remotePayload)
        .eq('id', input.id)
        .eq('user_id', resolvedUserId)
        .select()
        .maybeSingle();

      if (error) {
        throw mapSupabaseError(error, `Failed to update ${DOMAIN.entities.primary.displayName}.`);
      }

      const mapped = mapRemotePrimaryEntities(data ? [data] : undefined);
      const fallback: PrimaryEntityRecord = {
        id: input.id,
        userId: resolvedUserId,
        name: input.name ?? '',
        cadence: input.cadence ?? 'daily',
        color: input.color ?? '#ffffff',
        sortOrder: input.sortOrder ?? 0,
        isArchived: input.isArchived ?? false,
        createdAt: now,
        updatedAt: now,
        version: 1,
        deletedAt: input.deletedAt ?? null,
      };

      const result = mapped[0] ?? fallback;

      await queryClient.invalidateQueries({ queryKey: primaryEntitiesQueryKey(resolvedUserId) });

      return result;
    },
    ...options,
  });
}

export function useDeletePrimaryEntity(
  userId: string | null,
  options?: UseMutationOptions<string, Error, DeletePrimaryEntityInput>,
) {
  const queryClient = useQueryClient();

  return useMutation<string, Error, DeletePrimaryEntityInput>({
    mutationFn: async ({ id }) => {
      const resolvedUserId = requireUserId(userId);

      const { error } = await supabase
        .from(PRIMARY_REMOTE_TABLE)
        .delete()
        .eq('id', id)
        .eq('user_id', resolvedUserId);

      if (error) {
        throw mapSupabaseError(error, `Failed to delete ${DOMAIN.entities.primary.displayName}.`);
      }

      await queryClient.invalidateQueries({ queryKey: primaryEntitiesQueryKey(resolvedUserId) });

      return id;
    },
    ...options,
  });
}
