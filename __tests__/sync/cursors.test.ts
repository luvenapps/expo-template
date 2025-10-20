import { beforeEach, describe, expect, test } from '@jest/globals';
import { clearCursor, getCursor, resetCursors, setCursor } from '@/sync/cursors';

describe('cursor storage', () => {
  beforeEach(() => {
    resetCursors();
  });

  test('defaults to null when not set', () => {
    expect(getCursor('test')).toBeNull();
  });

  test('stores and retrieves values', () => {
    setCursor('test', 'cursor-value');
    expect(getCursor('test')).toBe('cursor-value');
  });

  test('clears a stored cursor', () => {
    setCursor('test', 'cursor-value');
    clearCursor('test');
    expect(getCursor('test')).toBeNull();
  });
});
