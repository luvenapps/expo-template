import { beforeEach, describe, expect, test } from '@jest/globals';
import { clearCursor, getCursor, resetCursors, setCursor } from '@/sync/cursors';

describe('cursor storage', () => {
  beforeEach(() => {
    resetCursors();
  });

  test('returns null when no cursor set', () => {
    expect(getCursor('sync-habits')).toBeNull();
  });

  test('persists cursor value', () => {
    setCursor('sync-habits', '2025-01-01T00:00:00Z');
    expect(getCursor('sync-habits')).toBe('2025-01-01T00:00:00Z');
  });

  test('clears a specific cursor', () => {
    setCursor('sync-habits', 'cursor');
    clearCursor('sync-habits');
    expect(getCursor('sync-habits')).toBeNull();
  });
});
