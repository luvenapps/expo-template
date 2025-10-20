import { afterEach, describe, expect, test } from '@jest/globals';
import { getQueryClient, resetQueryClient } from '@/state/queryClient';

describe('queryClient singleton', () => {
  afterEach(() => {
    resetQueryClient();
  });

  test('returns same instance across calls', () => {
    const first = getQueryClient();
    const second = getQueryClient();

    expect(first).toBe(second);
  });

  test('reset clears cached instance', () => {
    const original = getQueryClient();
    resetQueryClient();
    const next = getQueryClient();

    expect(next).not.toBe(original);
  });
});
