import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { getSupabaseClient, type SupabaseClient } from '../_shared/client.ts';
import { errorResponse, jsonResponse } from '../_shared/http.ts';
import {
  LOCAL_TO_REMOTE_TABLE,
  type LocalTableName,
  type RemoteTableName,
  toRemoteTable,
} from '../_shared/domain.ts';

const PAGE_SIZE = 200;

type CursorPayload = Partial<Record<LocalTableName, string | null>>;

type PullResponse = {
  success: true;
  records: Partial<Record<RemoteTableName, Record<string, unknown>[]>>;
  cursors: CursorPayload;
};

type RequestBody = {
  cursors?: CursorPayload;
  windowStart?: string | null;
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
      console.error('[sync-pull] auth error', userError);
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

    const { cursors, windowStart } = normalizeRequestBody(body);

    const response = await pullTables(supabase, user.id, cursors, windowStart);

    return jsonResponse(response);
  } catch (error) {
    console.error('[sync-pull] unexpected error', error);
    return errorResponse('Unexpected error.', 500);
  }
});

function normalizeRequestBody(body: unknown): {
  cursors: CursorPayload;
  windowStart: string | null;
} {
  if (typeof body !== 'object' || !body) {
    return { cursors: {}, windowStart: null };
  }

  const payload = body as RequestBody;
  const cursors = payload.cursors ?? {};
  const windowStart = typeof payload.windowStart === 'string' ? payload.windowStart : null;
  return { cursors, windowStart };
}

async function pullTables(
  supabase: SupabaseClient,
  userId: string,
  cursors: CursorPayload,
  windowStart: string | null,
): Promise<PullResponse> {
  const records: PullResponse['records'] = {};
  const nextCursors: CursorPayload = {};

  const tables = Object.keys(LOCAL_TO_REMOTE_TABLE) as LocalTableName[];

  for (const table of tables) {
    const remoteTable = toRemoteTable(table);
    const cursor = cursors?.[table] ?? null;

    let query = supabase
      .from(remoteTable)
      .select()
      .eq('user_id', userId)
      .order('updated_at', { ascending: true })
      .limit(PAGE_SIZE);

    if (cursor) {
      query = query.gt('updated_at', cursor);
    }

    if (windowStart) {
      query = query.gte('updated_at', windowStart);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    if (data && data.length) {
      records[toRemoteTable(table)] = data;
      const lastUpdated = data[data.length - 1]?.updated_at;
      nextCursors[table] = typeof lastUpdated === 'string' ? lastUpdated : cursor;
    } else if (cursor) {
      nextCursors[table] = cursor;
    } else {
      nextCursors[table] = null;
    }
  }

  return {
    success: true,
    records,
    cursors: nextCursors,
  };
}
