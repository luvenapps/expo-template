import { supabase } from '@/auth/client';
import { DOMAIN } from '@/config/domain.config';
import { mapPayloadToRemote, normalizePayload } from '@/supabase/mappers';
import { mapRemoteDeviceEntities } from '@/supabase/remoteMappers';
import type { DeviceRecord } from '@/supabase/types';
import { DEFAULT_GC_TIME, DEFAULT_STALE_TIME, mapSupabaseError, requireUserId } from './utils';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { v4 as uuid } from 'uuid';

const DEVICES_REMOTE_TABLE = DOMAIN.entities.devices.remoteTableName;
const DEVICES_LOCAL_TABLE = DOMAIN.entities.devices.tableName;

const devicesQueryKey = (userId: string | null) =>
  ['remote', DEVICES_REMOTE_TABLE, userId] as const;

type DevicesQueryKey = ReturnType<typeof devicesQueryKey>;

type DevicesQueryOptions = Omit<
  UseQueryOptions<DeviceRecord[], Error, DeviceRecord[], DevicesQueryKey>,
  'queryKey' | 'queryFn'
>;

type CreateDeviceInput = {
  platform: string;
  lastSyncAt?: string | null;
};

type UpdateDeviceInput = {
  id: string;
  platform?: string;
  lastSyncAt?: string | null;
  deletedAt?: string | null;
};

type DeleteDeviceInput = {
  id: string;
};

export async function fetchDevices(userId: string) {
  const { data, error } = await supabase
    .from(DEVICES_REMOTE_TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    throw mapSupabaseError(error, `Failed to load ${DOMAIN.entities.devices.plural}.`);
  }

  return mapRemoteDeviceEntities(data ?? []);
}

export function useDevices(userId: string | null, options?: DevicesQueryOptions) {
  return useQuery({
    queryKey: devicesQueryKey(userId),
    queryFn: () => fetchDevices(requireUserId(userId)),
    enabled: Boolean(userId),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
    ...options,
  });
}

export function useCreateDevice(
  userId: string | null,
  options?: UseMutationOptions<DeviceRecord, Error, CreateDeviceInput>,
) {
  const queryClient = useQueryClient();

  return useMutation<DeviceRecord, Error, CreateDeviceInput>({
    mutationFn: async (input) => {
      const resolvedUserId = requireUserId(userId);
      const now = new Date().toISOString();

      const record: DeviceRecord = {
        id: uuid(),
        userId: resolvedUserId,
        platform: input.platform,
        lastSyncAt: input.lastSyncAt ?? null,
        createdAt: now,
        updatedAt: now,
        version: 1,
        deletedAt: null,
      };

      const remotePayload = normalizePayload(
        mapPayloadToRemote(DEVICES_LOCAL_TABLE, record, { user_id: resolvedUserId }),
      );

      const { data, error } = await supabase
        .from(DEVICES_REMOTE_TABLE)
        .insert(remotePayload)
        .select()
        .maybeSingle();

      if (error) {
        throw mapSupabaseError(error, `Failed to register ${DOMAIN.entities.devices.displayName}.`);
      }

      const mapped = mapRemoteDeviceEntities(data ? [data] : undefined);
      const result = mapped[0] ?? record;

      await queryClient.invalidateQueries({ queryKey: devicesQueryKey(resolvedUserId) });

      return result;
    },
    ...options,
  });
}

export function useUpdateDevice(
  userId: string | null,
  options?: UseMutationOptions<DeviceRecord, Error, UpdateDeviceInput>,
) {
  const queryClient = useQueryClient();

  return useMutation<DeviceRecord, Error, UpdateDeviceInput>({
    mutationFn: async (input) => {
      const resolvedUserId = requireUserId(userId);
      const now = new Date().toISOString();

      const remotePayload = normalizePayload(
        mapPayloadToRemote(DEVICES_LOCAL_TABLE, {
          ...input,
          userId: resolvedUserId,
          updatedAt: now,
        }),
      );

      const { data, error } = await supabase
        .from(DEVICES_REMOTE_TABLE)
        .update(remotePayload)
        .eq('id', input.id)
        .eq('user_id', resolvedUserId)
        .select()
        .maybeSingle();

      if (error) {
        throw mapSupabaseError(error, `Failed to update ${DOMAIN.entities.devices.displayName}.`);
      }

      const mapped = mapRemoteDeviceEntities(data ? [data] : undefined);
      const fallback: DeviceRecord = {
        id: input.id,
        userId: resolvedUserId,
        platform: input.platform ?? 'unknown',
        lastSyncAt: input.lastSyncAt ?? null,
        createdAt: now,
        updatedAt: now,
        version: 1,
        deletedAt: input.deletedAt ?? null,
      };

      const result = mapped[0] ?? fallback;

      await queryClient.invalidateQueries({ queryKey: devicesQueryKey(resolvedUserId) });

      return result;
    },
    ...options,
  });
}

export function useDeleteDevice(
  userId: string | null,
  options?: UseMutationOptions<string, Error, DeleteDeviceInput>,
) {
  const queryClient = useQueryClient();

  return useMutation<string, Error, DeleteDeviceInput>({
    mutationFn: async ({ id }) => {
      const resolvedUserId = requireUserId(userId);

      const { error } = await supabase
        .from(DEVICES_REMOTE_TABLE)
        .delete()
        .eq('id', id)
        .eq('user_id', resolvedUserId);

      if (error) {
        throw mapSupabaseError(error, `Failed to delete ${DOMAIN.entities.devices.displayName}.`);
      }

      await queryClient.invalidateQueries({ queryKey: devicesQueryKey(resolvedUserId) });

      return id;
    },
    ...options,
  });
}
