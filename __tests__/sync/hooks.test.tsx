import { renderHook } from '@testing-library/react-native';
import { useSync } from '@/sync/hooks';

// Mock dependencies
jest.mock('@/sync/engine', () => ({
  createSyncEngine: jest.fn(() => ({
    runSync: jest.fn(),
  })),
}));

jest.mock('@/sync/useSyncManager', () => ({
  useSyncManager: jest.fn(() => ({
    triggerSync: jest.fn(),
  })),
}));

jest.mock('@/state', () => ({
  useSyncStore: jest.fn(() => ({
    status: 'idle',
    queueSize: 0,
    lastSyncedAt: null,
    lastError: null,
  })),
}));

describe('useSync', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return sync state and triggerSync function', () => {
    const { result } = renderHook(() =>
      useSync({
        push: mockPush,
        enabled: false,
      }),
    );

    expect(result.current).toEqual({
      status: 'idle',
      queueSize: 0,
      lastSyncedAt: null,
      lastError: null,
      triggerSync: expect.any(Function),
    });
  });

  it('should use default enabled value when not provided', () => {
    const { result } = renderHook(() =>
      useSync({
        push: mockPush,
      }),
    );

    expect(result.current).toBeDefined();
    expect(result.current.triggerSync).toBeDefined();
  });

  it('should accept all optional parameters', () => {
    const mockPull = jest.fn();

    const { result } = renderHook(() =>
      useSync({
        push: mockPush,
        pull: mockPull,
        batchSize: 50,
        enabled: true,
        intervalMs: 30000,
      }),
    );

    expect(result.current).toBeDefined();
  });
});
