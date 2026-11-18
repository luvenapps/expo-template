import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { getSupabaseClient, type SupabaseClient } from '../_shared/client.ts';
import { errorResponse, jsonResponse } from '../_shared/http.ts';
import { LOCAL_TO_REMOTE_TABLE, type LocalTableName, toRemoteTable } from '../_shared/domain.ts';
import { DOMAIN } from '../../../src/config/domain.config.ts';

type ExportResponse = {
  success: true;
  data: Record<string, unknown[]>;
  csv: Record<string, string>;
};

serve(async (req: Request) => {
  try {
    if (req.method !== 'GET') {
      return errorResponse('Method not allowed', 405);
    }

    const supabase = getSupabaseClient(req);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error('[export] auth error', userError);
      return errorResponse('Unauthorized', 401);
    }

    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    const exportData = await gatherExportData(supabase, user.id);
    return jsonResponse(exportData);
  } catch (error) {
    console.error('[export] unexpected error', error);
    return errorResponse('Unexpected error.', 500);
  }
});

async function gatherExportData(supabase: SupabaseClient, userId: string): Promise<ExportResponse> {
  const tables = Object.keys(LOCAL_TO_REMOTE_TABLE) as LocalTableName[];
  const data: Record<string, unknown[]> = {};

  for (const table of tables) {
    const remoteTable = toRemoteTable(table);
    const { data: rows, error } = await supabase.from(remoteTable).select().eq('user_id', userId);

    if (error) {
      throw error;
    }

    data[toRemoteTable(table)] = rows ?? [];
  }

  const entryTable = DOMAIN.entities.entries.tableName as LocalTableName;
  const entryRemote = toRemoteTable(entryTable);

  return {
    success: true,
    data,
    csv: {
      [entryRemote]: toCsv(data[entryRemote] ?? []),
    },
  };
}

function toCsv(rows: unknown[]): string {
  if (!Array.isArray(rows) || !rows.length) {
    return '';
  }

  const headers = Object.keys(rows[0] as Record<string, unknown>);
  const lines = [headers.join(',')];

  for (const row of rows) {
    const record = row as Record<string, unknown>;
    const values = headers.map((header) => formatCsvValue(record[header]));
    lines.push(values.join(','));
  }

  return lines.join('\n');
}

function formatCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value).replace(/"/g, '""');
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue}"`;
  }

  return stringValue;
}
