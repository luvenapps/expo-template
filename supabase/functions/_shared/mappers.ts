import type { LocalTableName } from './domain.ts';
import { COLUMN_MAPPINGS } from './domain.ts';

export function mapPayloadToRemote(
  table: LocalTableName,
  payload: Record<string, unknown>,
  overrides: Record<string, unknown> = {},
) {
  const mapping = COLUMN_MAPPINGS[table] ?? {};
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    const remoteKey = mapping[key] ?? key;
    if (value === undefined) continue;
    result[remoteKey] = value;
  }

  for (const [key, value] of Object.entries(overrides)) {
    result[key] = value;
  }

  return result;
}

export function normalizePayload<T extends Record<string, unknown>>(payload: T) {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    normalized[key] = value === undefined ? null : value;
  }
  return normalized;
}
