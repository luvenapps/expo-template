import { __setFeatureFlagClientForTests } from '@/featureFlags';
import { useFeatureFlag, useFeatureFlagsReady } from '@/featureFlags/useFeatureFlag';
import { act, renderHook } from '@testing-library/react-native';
import { createMockProvider } from '@/featureFlags/testing';
import React from 'react';

describe('useFeatureFlag', () => {
  afterEach(() => {
    __setFeatureFlagClientForTests(null);
  });

  it('returns default value and updates on change', async () => {
    const { client, set } = createMockProvider({ test_feature_flag: false });
    __setFeatureFlagClientForTests(client);

    const { result } = await renderHook(() => useFeatureFlag('test_feature_flag', true));

    expect(result.current.value).toBe(false);
    expect(result.current.source).toBe('default');

    await act(() => {
      set('test_feature_flag', true);
    });

    expect(result.current.value).toBe(true);
  });

  it('ignores updates for other keys', async () => {
    const { client, set } = createMockProvider({ test_feature_flag: false, other_flag: false });
    __setFeatureFlagClientForTests(client);

    const { result } = await renderHook(() => useFeatureFlag('test_feature_flag', true));
    const { value: initialValue, status: initialStatus } = result.current;

    await act(() => {
      set('other_flag', true);
    });

    expect(result.current.value).toBe(initialValue);
    expect(result.current.status).toBe(initialStatus);
  });

  it('exposes ready status', async () => {
    const { client } = createMockProvider({}, 'ready');
    __setFeatureFlagClientForTests(client);

    const { result } = await renderHook(() => useFeatureFlagsReady());
    expect(result.current.ready).toBe(true);
    expect(result.current.status).toBe('ready');
  });

  it('uses server snapshot when provided', async () => {
    const syncSpy = jest
      .spyOn(React, 'useSyncExternalStore')
      .mockImplementation((_subscribe, _getSnapshot, getServerSnapshot) => {
        if (getServerSnapshot) {
          return getServerSnapshot();
        }
        return _getSnapshot();
      });

    const { client } = createMockProvider({ test_feature_flag: false }, 'ready');
    __setFeatureFlagClientForTests(client);

    const { result: flagResult, rerender } = await renderHook(
      ({ flagKey, fallback }: { flagKey: 'test_feature_flag'; fallback: boolean }) =>
        useFeatureFlag(flagKey, fallback),
      {
        initialProps: { flagKey: 'test_feature_flag', fallback: true },
      },
    );
    expect(flagResult.current.value).toBe(false);
    expect(flagResult.current.status).toBe('ready');

    await rerender({ flagKey: 'test_feature_flag', fallback: true });

    const { result: readyResult } = await renderHook(() => useFeatureFlagsReady());
    expect(readyResult.current.ready).toBe(true);
    expect(readyResult.current.status).toBe('ready');

    syncSpy.mockRestore();
  });

  it('swallows ready errors in hooks', async () => {
    const mockClient = {
      ready: jest.fn().mockRejectedValue(new Error('ready failed')),
      getStatus: jest.fn().mockReturnValue('ready'),
      getFlag: jest.fn().mockReturnValue(true),
      getSource: jest.fn().mockReturnValue('default'),
      setContext: jest.fn().mockResolvedValue(undefined),
      refresh: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn(() => jest.fn()),
      destroy: jest.fn(),
    };

    __setFeatureFlagClientForTests(mockClient);

    const { result } = await renderHook(() => useFeatureFlag('test_feature_flag', false));
    await act(async () => {});
    expect(result.current.value).toBe(true);
    expect(result.current.source).toBe('default');

    const { result: readyResult } = await renderHook(() => useFeatureFlagsReady());
    await act(async () => {});
    expect(readyResult.current.ready).toBe(true);
  });
});
