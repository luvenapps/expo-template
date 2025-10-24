import { afterEach, describe, expect, test } from '@jest/globals';
import { getQueryClient, resetQueryClient } from '@/state/queryClient';

describe('queryClient singleton', () => {
  afterEach(() => {
    resetQueryClient();
  });

  test('returns same instance across calls', () => {
    const a = getQueryClient();
    const b = getQueryClient();

    expect(a).toBe(b);
  });

  test('reset creates a new instance', () => {
    const a = getQueryClient();
    resetQueryClient();
    const b = getQueryClient();

    expect(b).not.toBe(a);
  });
});
