import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { getSupabaseClient, type SupabaseClient } from '../_shared/client.ts';
import { errorResponse, jsonResponse } from '../_shared/http.ts';
import {
  COLUMN_MAPPINGS,
  MERGE_UNIQUE_CONSTRAINTS,
  type LocalTableName,
  type MutationOperation,
  type RemoteTableName,
  toRemoteTable,
} from '../_shared/domain.ts';
import { mapPayloadToRemote, normalizePayload } from '../_shared/mappers.ts';

type SyncMutation = {
  id: string;
  table: LocalTableName;
  operation: MutationOperation;
  version: number;
  payload?: Record<string, unknown>;
};

type PushResponse = {
  success: true;
  updated?: Partial<Record<RemoteTableName, Record<string, unknown>[]>>;
};

serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 405);
    }

    const supabase = getSupabaseClient(req);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error('[sync-push] auth error', userError);
      return errorResponse('Unauthorized', 401);
    }

    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }

    if (
      !body ||
      typeof body !== 'object' ||
      !Array.isArray((body as { mutations?: unknown }).mutations)
    ) {
      return errorResponse('Invalid payload. Expected "mutations" array.', 400);
    }

    const mutations = (body as { mutations: SyncMutation[] }).mutations;
    const updates: PushResponse['updated'] = {};

    for (const mutation of mutations) {
      try {
        await processMutation({
          supabase,
          mutation,
          userId: user.id,
          updates,
        });
      } catch (error) {
        console.error('[sync-push] mutation failure', {
          table: mutation?.table,
          id: mutation?.id,
          message: error instanceof Error ? error.message : String(error),
        });
        return errorResponse('Failed to process sync mutations.', 500);
      }
    }

    const response: PushResponse = {
      success: true,
      ...(updates && Object.keys(updates).length ? { updated: updates } : {}),
    };

    return jsonResponse(response);
  } catch (error) {
    console.error('[sync-push] unexpected error', error);
    return errorResponse('Unexpected error.', 500);
  }
});

type ProcessContext = {
  supabase: SupabaseClient;
  mutation: SyncMutation;
  userId: string;
  updates: PushResponse['updated'];
};

async function processMutation({ supabase, mutation, userId, updates }: ProcessContext) {
  if (!mutation?.id || !mutation.table || !mutation.operation) {
    throw new Error('Malformed mutation payload.');
  }

  if (!(mutation.table in COLUMN_MAPPINGS)) {
    throw new Error(`Unsupported table "${mutation.table}".`);
  }

  const remoteTable = toRemoteTable(mutation.table);
  const now = new Date().toISOString();

  const { data: existingRow, error: selectError } = await supabase
    .from(remoteTable)
    .select()
    .eq('id', mutation.id)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (
    existingRow &&
    typeof existingRow.version === 'number' &&
    mutation.version <= existingRow.version
  ) {
    // Ignore stale mutation
    return;
  }

  if (mutation.operation === 'delete') {
    if (!existingRow) {
      // Nothing to delete on the server; treat as success
      return;
    }

    const { data: deletedRow, error: deleteError } = await supabase
      .from(remoteTable)
      .update(
        normalizePayload({
          deleted_at: now,
          updated_at: now,
          version: mutation.version,
        }),
      )
      .eq('id', mutation.id)
      .select()
      .maybeSingle();

    if (deleteError) {
      throw deleteError;
    }

    addUpdate(updates, mutation.table, deletedRow);
    return;
  }

  const payload = mutation.payload ?? {};
  const remotePayload = mapPayloadToRemote(mutation.table, payload, {
    user_id: userId,
  });

  const baseRecord = normalizePayload({
    ...remotePayload,
    id: mutation.id,
    user_id: userId,
    created_at: existingRow?.created_at ?? now,
    updated_at: now,
    version: mutation.version,
  });

  // Ensure deleted_at is null unless explicitly provided
  if (!('deleted_at' in baseRecord)) {
    baseRecord.deleted_at = existingRow?.deleted_at ?? null;
  }

  // Handle merge rules for tables with unique constraints beyond the primary key
  const mergeConfig = MERGE_UNIQUE_CONSTRAINTS[mutation.table];
  if (mergeConfig) {
    const mergeTarget = await findMergeTarget(supabase, remoteTable, mergeConfig, {
      id: mutation.id,
      record: baseRecord,
      userId,
    });

    if (mergeTarget && mergeTarget.id !== mutation.id) {
      const mergedAmount = Number(mergeTarget.amount ?? 0) + Number(baseRecord.amount ?? 0);

      const updatePayload = normalizePayload({
        amount: mergedAmount,
        updated_at: now,
        version: Math.max(mutation.version, Number(mergeTarget.version ?? 1) + 1),
      });

      const { data: mergedRow, error: mergeError } = await supabase
        .from(remoteTable)
        .update(updatePayload)
        .eq('id', mergeTarget.id)
        .select()
        .maybeSingle();

      if (mergeError) {
        throw mergeError;
      }

      addUpdate(updates, mutation.table, mergedRow);
      return;
    }
  }

  const { data: upsertedRow, error: upsertError } = await supabase
    .from(remoteTable)
    .upsert(baseRecord, { onConflict: 'id' })
    .select()
    .maybeSingle();

  if (upsertError) {
    throw upsertError;
  }

  addUpdate(updates, mutation.table, upsertedRow);
}

async function findMergeTarget(
  supabase: SupabaseClient,
  remoteTable: string,
  mergeConfig: { columns: string[]; condition?: string },
  context: { id: string; record: Record<string, unknown>; userId: string },
) {
  const filters = mergeConfig.columns.map((column) => ({
    column,
    value: context.record[column],
  }));

  if (filters.some((filter) => filter.value === undefined || filter.value === null)) {
    return null;
  }

  let query = supabase.from(remoteTable).select().eq('user_id', context.userId);

  for (const filter of filters) {
    query = query.eq(filter.column, filter.value as string | number | boolean);
  }

  if (mergeConfig.condition?.toLowerCase().includes('deleted_at is null')) {
    query = query.is('deleted_at', null);
  }

  const { data: existing, error } = await query.limit(1).maybeSingle();

  if (error) {
    throw error;
  }

  if (!existing || existing.id === context.id) {
    return null;
  }

  return existing;
}

function addUpdate(
  updates: PushResponse['updated'],
  table: LocalTableName,
  row: Record<string, unknown> | null,
) {
  if (!row) return;
  if (!updates) return;
  const remoteTable = toRemoteTable(table);
  if (!updates[remoteTable]) {
    updates[remoteTable] = [];
  }
  updates[remoteTable]!.push(row);
}
