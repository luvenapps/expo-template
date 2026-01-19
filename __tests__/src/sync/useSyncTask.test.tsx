jest.useFakeTimers();

const definedTasks: Record<string, jest.Mock> = {};

// Mock expo modules
jest.mock('expo-background-task', () => ({
  BackgroundTaskResult: {
    Success: 1,
    Failed: 2,
  },
  BackgroundTaskStatus: {
    Restricted: 1,
    Available: 2,
  },
  registerTaskAsync: jest.fn().mockResolvedValue(undefined),
  unregisterTaskAsync: jest.fn().mockResolvedValue(undefined),
  getStatusAsync: jest.fn().mockResolvedValue(2), // Available
}));

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn((name: string, executor: jest.Mock) => {
    definedTasks[name] = executor;
  }),
  isTaskDefined: jest.fn((name: string) => Boolean(definedTasks[name])),
  isTaskRegisteredAsync: jest.fn().mockResolvedValue(false),
}));

import { DOMAIN } from '@/config/domain.config';
import { useSyncTask } from '@/sync/useSyncTask';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { AppState, AppStateStatus, Platform } from 'react-native';

const mockEngine = {
  runSync: jest.fn().mockResolvedValue(undefined),
};

const listeners: ((state: AppStateStatus) => void)[] = [];
let addEventListenerSpy: jest.SpyInstance;

const createDeferred = <T = void,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('useSyncTask', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    listeners.length = 0;
    mockEngine.runSync.mockReset();
    mockEngine.runSync.mockResolvedValue(undefined);
    Object.keys(definedTasks).forEach((key) => delete definedTasks[key]);

    addEventListenerSpy = jest.spyOn(AppState, 'addEventListener');
    addEventListenerSpy.mockImplementation(
      (_type: string, handler: (state: AppStateStatus) => void) => {
        listeners.push(handler);
        return {
          remove: () => {
            const index = listeners.indexOf(handler);
            if (index !== -1) listeners.splice(index, 1);
          },
        } as any;
      },
    );
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
  });

  afterEach(() => {
    addEventListenerSpy?.mockRestore();
    Object.defineProperty(Platform, 'OS', { value: originalPlatform, configurable: true });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('basic functionality', () => {
    it('should run sync on mount when autoStart is true', async () => {
      renderHook(() => useSyncTask({ engine: mockEngine as any, enabled: true }));
      await act(async () => {
        await Promise.resolve();
      });
      expect(mockEngine.runSync).toHaveBeenCalledTimes(1);
    });

    it('should not run sync on mount when autoStart is false', async () => {
      renderHook(() => useSyncTask({ engine: mockEngine as any, enabled: true, autoStart: false }));
      await act(async () => {
        await Promise.resolve();
      });
      expect(mockEngine.runSync).not.toHaveBeenCalled();
    });

    it('should return triggerSync function', () => {
      const { result } = renderHook(() => useSyncTask({ engine: mockEngine as any }));
      expect(result.current.triggerSync).toBeInstanceOf(Function);
    });

    it('should trigger sync when triggerSync is called', async () => {
      const { result } = renderHook(() =>
        useSyncTask({ engine: mockEngine as any, autoStart: false }),
      );

      await act(async () => {
        await result.current.triggerSync();
      });

      expect(mockEngine.runSync).toHaveBeenCalledTimes(1);
    });
  });

  describe('interval-based sync', () => {
    it('should run sync on interval', async () => {
      renderHook(() =>
        useSyncTask({ engine: mockEngine as any, intervalMs: 1000, autoStart: false }),
      );

      await act(async () => {
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      expect(mockEngine.runSync).toHaveBeenCalledTimes(1);

      await act(async () => {
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      expect(mockEngine.runSync).toHaveBeenCalledTimes(2);
    });

    it('clears the interval when intervalMs changes', async () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      const { rerender } = renderHook(
        (props: { intervalMs: number }) =>
          useSyncTask({
            engine: mockEngine as any,
            intervalMs: props.intervalMs,
            autoStart: false,
          }),
        { initialProps: { intervalMs: 1000 } },
      );

      await act(async () => {
        await Promise.resolve();
      });

      rerender({ intervalMs: 2000 });

      await act(async () => {
        await Promise.resolve();
      });

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('app state change handling', () => {
    it('should run sync when app becomes active', async () => {
      renderHook(() => useSyncTask({ engine: mockEngine as any, autoStart: false }));

      mockEngine.runSync.mockClear();

      await act(async () => {
        listeners.forEach((listener) => listener('active'));
        await Promise.resolve();
      });

      expect(mockEngine.runSync).toHaveBeenCalledTimes(1);
    });

    it('should not run sync when app goes to background', async () => {
      renderHook(() => useSyncTask({ engine: mockEngine as any, autoStart: false }));

      mockEngine.runSync.mockClear();

      await act(async () => {
        listeners.forEach((listener) => listener('background'));
        await Promise.resolve();
      });

      expect(mockEngine.runSync).not.toHaveBeenCalled();
    });

    it('should handle legacy addEventListener API', async () => {
      addEventListenerSpy.mockRestore();

      const legacyListeners: ((state: AppStateStatus) => void)[] = [];
      const legacyAddEventListener = jest.fn(
        (_type: string, handler: (state: AppStateStatus) => void) => {
          legacyListeners.push(handler);
        },
      );

      let accessCount = 0;
      Object.defineProperty(AppState, 'addEventListener', {
        configurable: true,
        get: () => {
          accessCount += 1;
          return accessCount === 1 ? undefined : legacyAddEventListener;
        },
      });

      renderHook(() => useSyncTask({ engine: mockEngine as any, autoStart: false }));

      expect(legacyAddEventListener).toHaveBeenCalledWith('change', expect.any(Function));

      mockEngine.runSync.mockClear();

      await act(async () => {
        legacyListeners.forEach((listener) => listener('active'));
        await Promise.resolve();
      });

      expect(mockEngine.runSync).toHaveBeenCalledTimes(1);
    });
  });

  describe('enabled/disabled state', () => {
    it('should not run sync when disabled', async () => {
      renderHook(() => useSyncTask({ engine: mockEngine as any, enabled: false }));

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockEngine.runSync).not.toHaveBeenCalled();
    });

    it('should clean up interval when disabled', async () => {
      const { rerender } = renderHook(
        (props: { enabled: boolean }) =>
          useSyncTask({ engine: mockEngine as any, enabled: props.enabled, intervalMs: 1000 }),
        { initialProps: { enabled: true } },
      );

      mockEngine.runSync.mockClear();

      // Disable
      rerender({ enabled: false });

      await act(async () => {
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      // Should not run after being disabled
      expect(mockEngine.runSync).not.toHaveBeenCalled();
    });

    it('should remove app state listener when disabled', async () => {
      const { rerender } = renderHook(
        (props: { enabled: boolean }) =>
          useSyncTask({ engine: mockEngine as any, enabled: props.enabled }),
        { initialProps: { enabled: true } },
      );

      expect(listeners.length).toBe(1);

      // Disable
      rerender({ enabled: false });

      await act(async () => {
        await Promise.resolve();
      });

      expect(listeners.length).toBe(0);
    });

    it('should clean up both interval and listener when disabling', async () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      const { rerender } = renderHook(
        (props: { enabled: boolean }) =>
          useSyncTask({
            engine: mockEngine as any,
            enabled: props.enabled,
            intervalMs: 1000,
          }),
        { initialProps: { enabled: true } },
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(listeners.length).toBe(1);

      // Disable - should trigger cleanup of both interval and listener
      rerender({ enabled: false });

      await act(async () => {
        await Promise.resolve();
      });

      expect(clearIntervalSpy).toHaveBeenCalled();
      expect(listeners.length).toBe(0);

      clearIntervalSpy.mockRestore();
    });

    it('should clear stale interval and listener refs when mounting disabled', async () => {
      const removeSpy = jest.fn();
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      const React = require('react') as typeof import('react');
      const originalUseRef = React.useRef;
      let callIndex = 0;

      const useRefSpy = jest.spyOn(React, 'useRef').mockImplementation((initialValue) => {
        callIndex += 1;
        if (callIndex === 2) {
          return { current: 123 } as React.MutableRefObject<ReturnType<typeof setInterval> | null>;
        }
        if (callIndex === 3) {
          return { current: { remove: removeSpy } } as React.MutableRefObject<{
            remove?: () => void;
          } | null>;
        }
        return originalUseRef(initialValue);
      });

      renderHook(() => useSyncTask({ engine: mockEngine as any, enabled: false }));

      await act(async () => {
        await Promise.resolve();
      });

      expect(clearIntervalSpy).toHaveBeenCalledWith(123);
      expect(removeSpy).toHaveBeenCalledTimes(1);

      useRefSpy.mockRestore();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('run coordination & backoff', () => {
    it('reuses queued promise when already queued', async () => {
      const firstRun = createDeferred<void>();
      mockEngine.runSync
        .mockImplementationOnce(() => firstRun.promise)
        .mockResolvedValueOnce(undefined);

      const { result } = renderHook(() =>
        useSyncTask({
          engine: mockEngine as any,
          enabled: true,
          autoStart: false,
          intervalMs: 1000,
        }),
      );

      let queuedPromise: Promise<void> | undefined;

      void result.current.triggerSync();
      queuedPromise = result.current.triggerSync();

      await act(async () => {
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      expect(mockEngine.runSync).toHaveBeenCalledTimes(1);
      expect(queuedPromise).toBeDefined();

      await act(async () => {
        firstRun.resolve();
      });

      await act(async () => {
        jest.runAllTicks();
        await Promise.resolve();
      });

      await expect(queuedPromise).resolves.toBeUndefined();
      expect(mockEngine.runSync).toHaveBeenCalledTimes(2);
    });

    it('rejects queued promise when queued run fails', async () => {
      const firstRun = createDeferred<void>();
      const queuedError = new Error('boom');
      mockEngine.runSync
        .mockImplementationOnce(() => firstRun.promise)
        .mockRejectedValueOnce(queuedError);

      const { result } = renderHook(() =>
        useSyncTask({ engine: mockEngine as any, enabled: true, autoStart: false }),
      );

      let queuedPromise: Promise<void> | undefined;

      void result.current.triggerSync();
      queuedPromise = result.current.triggerSync();
      const queuedExpectation = expect(queuedPromise).rejects.toThrow('boom');

      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        firstRun.resolve();
      });

      await act(async () => {
        jest.runAllTicks();
        await Promise.resolve();
      });

      await queuedExpectation;
      expect(mockEngine.runSync).toHaveBeenCalledTimes(2);
    });

    it('returns early when a queued run is already present', async () => {
      const queuedPromise = Promise.resolve();
      const React = require('react') as typeof import('react');
      const originalUseRef = React.useRef;
      let callIndex = 0;

      const useRefSpy = jest.spyOn(React, 'useRef').mockImplementation((initialValue) => {
        callIndex += 1;
        if (callIndex === 4) {
          return { current: true } as React.MutableRefObject<boolean>;
        }
        if (callIndex === 5) {
          return { current: true } as React.MutableRefObject<boolean>;
        }
        if (callIndex === 6) {
          return { current: false } as React.MutableRefObject<boolean>;
        }
        if (callIndex === 8) {
          return { current: queuedPromise } as React.MutableRefObject<Promise<void> | null>;
        }
        return originalUseRef(initialValue);
      });

      const { result } = renderHook(() =>
        useSyncTask({ engine: mockEngine as any, enabled: true, autoStart: false }),
      );

      await act(async () => {
        await result.current.triggerSync();
      });

      expect(mockEngine.runSync).not.toHaveBeenCalled();
      useRefSpy.mockRestore();
    });

    it('queues interval-based sync while another run is active', async () => {
      const firstRun = createDeferred<void>();
      mockEngine.runSync
        .mockImplementationOnce(() => firstRun.promise)
        .mockResolvedValueOnce(undefined);

      renderHook(() => useSyncTask({ engine: mockEngine as any, enabled: true, intervalMs: 1000 }));

      expect(mockEngine.runSync).toHaveBeenCalledTimes(1);

      await act(async () => {
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      expect(mockEngine.runSync).toHaveBeenCalledTimes(1);

      await act(async () => {
        firstRun.resolve();
        await Promise.resolve();
      });

      await act(async () => {
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });

      expect(mockEngine.runSync).toHaveBeenCalledTimes(2);
    });

    it('applies cooldown after failures', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockEngine.runSync.mockRejectedValueOnce(new Error('fail'));
      mockEngine.runSync.mockResolvedValueOnce(undefined);

      renderHook(() => useSyncTask({ engine: mockEngine as any, enabled: true, intervalMs: 1000 }));

      await act(async () => {
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });

      expect(mockEngine.runSync).toHaveBeenCalledTimes(1);

      await act(async () => {
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      expect(mockEngine.runSync).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Sync] Skipping scheduled run'),
        expect.anything(),
      );

      await act(async () => {
        jest.advanceTimersByTime(2000);
        await Promise.resolve();
      });

      expect(mockEngine.runSync).toHaveBeenCalledTimes(2);

      consoleWarnSpy.mockRestore();
    });

    it('allows triggerSync to bypass cooldown', async () => {
      mockEngine.runSync.mockRejectedValueOnce(new Error('fail'));
      mockEngine.runSync.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() =>
        useSyncTask({ engine: mockEngine as any, enabled: true, autoStart: false }),
      );

      await act(async () => {
        await result.current.triggerSync().catch(() => undefined);
      });

      expect(mockEngine.runSync).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.triggerSync();
      });

      expect(mockEngine.runSync).toHaveBeenCalledTimes(2);
    });
  });

  describe('background fetch', () => {
    it('should register background task when enabled', async () => {
      renderHook(() =>
        useSyncTask({ engine: mockEngine as any, enabled: true, backgroundInterval: 900 }),
      );

      await waitFor(() => {
        expect(BackgroundTask.registerTaskAsync).toHaveBeenCalledWith(DOMAIN.app.syncTask, {
          minimumInterval: 900,
        });
      });
    });

    it('should skip registration when background tasks are restricted', async () => {
      (BackgroundTask.getStatusAsync as jest.Mock).mockResolvedValue(1); // Restricted
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      renderHook(() =>
        useSyncTask({ engine: mockEngine as any, enabled: true, backgroundInterval: 900 }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(BackgroundTask.registerTaskAsync).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[Sync] Background tasks are disabled or restricted. Skipping registration.',
        ),
        expect.anything(),
      );

      warnSpy.mockRestore();
      (BackgroundTask.getStatusAsync as jest.Mock).mockResolvedValue(2);
    });

    it('should register task when not previously defined', async () => {
      renderHook(() => useSyncTask({ engine: mockEngine as any, enabled: true }));

      await waitFor(() => {
        expect(BackgroundTask.registerTaskAsync).toHaveBeenCalledWith(DOMAIN.app.syncTask, {
          minimumInterval: expect.any(Number),
        });
        expect(definedTasks[DOMAIN.app.syncTask]).toBeDefined();
      });
    });

    it('should avoid redefining task when already defined', async () => {
      definedTasks[DOMAIN.app.syncTask] = jest.fn();

      renderHook(() => useSyncTask({ engine: mockEngine as any, enabled: true }));

      await waitFor(() => {
        expect(BackgroundTask.registerTaskAsync).toHaveBeenCalled();
      });

      expect(TaskManager.defineTask).not.toHaveBeenCalled();
    });

    it('should unregister background task when disabled', async () => {
      const { rerender } = renderHook(
        (props: { enabled: boolean }) =>
          useSyncTask({ engine: mockEngine as any, enabled: props.enabled }),
        { initialProps: { enabled: true } },
      );

      await waitFor(() => {
        expect(BackgroundTask.registerTaskAsync).toHaveBeenCalled();
      });

      (BackgroundTask.getStatusAsync as jest.Mock).mockResolvedValue(2); // Available

      // Disable
      rerender({ enabled: false });

      await waitFor(() => {
        expect(BackgroundTask.unregisterTaskAsync).toHaveBeenCalled();
      });
    });

    it('should skip unregister when background task is restricted', async () => {
      const statusMock = BackgroundTask.getStatusAsync as jest.Mock;
      statusMock.mockResolvedValueOnce(2); // Available for registration
      statusMock.mockResolvedValue(1); // Restricted for subsequent checks

      const { rerender } = renderHook(
        (props: { enabled: boolean }) =>
          useSyncTask({ engine: mockEngine as any, enabled: props.enabled }),
        { initialProps: { enabled: true } },
      );

      await waitFor(() => {
        expect(BackgroundTask.registerTaskAsync).toHaveBeenCalled();
      });

      jest.clearAllMocks();

      // Disable
      rerender({ enabled: false });

      await act(async () => {
        await Promise.resolve();
      });

      // Should not try to unregister when restricted
      expect(BackgroundTask.unregisterTaskAsync).not.toHaveBeenCalled();

      statusMock.mockResolvedValue(2);
    });

    it('should return Success when handler is missing', async () => {
      const { unmount } = renderHook(() =>
        useSyncTask({ engine: mockEngine as any, enabled: true }),
      );

      await waitFor(() => {
        expect(definedTasks[DOMAIN.app.syncTask]).toBeDefined();
      });

      unmount();

      const result = await definedTasks[DOMAIN.app.syncTask]!();

      expect(result).toBe(BackgroundTask.BackgroundTaskResult.Success);
    });
  });

  describe('error handling', () => {
    it('should handle sync errors gracefully', async () => {
      mockEngine.runSync.mockRejectedValueOnce(new Error('Sync failed'));

      renderHook(() => useSyncTask({ engine: mockEngine as any, enabled: true }));

      await act(async () => {
        await Promise.resolve();
      });

      // Should not throw
      expect(mockEngine.runSync).toHaveBeenCalled();
    });

    it('should handle background task registration errors gracefully', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      (BackgroundTask.registerTaskAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Register failed'),
      );

      renderHook(() => useSyncTask({ engine: mockEngine as any, enabled: true }));

      await act(async () => {
        await Promise.resolve();
      });

      expect(BackgroundTask.registerTaskAsync).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Sync] Failed to register background task:'),
        expect.any(Error),
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle unregister errors gracefully', async () => {
      const { rerender } = renderHook(
        (props: { enabled: boolean }) =>
          useSyncTask({ engine: mockEngine as any, enabled: props.enabled }),
        { initialProps: { enabled: true } },
      );

      await waitFor(() => {
        expect(BackgroundTask.registerTaskAsync).toHaveBeenCalled();
      });

      (BackgroundTask.unregisterTaskAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Unregister failed'),
      );
      (BackgroundTask.getStatusAsync as jest.Mock).mockResolvedValue(2); // Available

      // Disable to trigger unregister
      rerender({ enabled: false });

      await waitFor(() => {
        expect(BackgroundTask.unregisterTaskAsync).toHaveBeenCalled();
      });

      // Should not throw - error is caught
    });
  });

  describe('cleanup', () => {
    it('should clean up on unmount', async () => {
      const { unmount } = renderHook(() =>
        useSyncTask({ engine: mockEngine as any, enabled: true }),
      );

      expect(listeners.length).toBe(1);

      unmount();

      expect(listeners.length).toBe(0);
    });

    it('clears the interval on unmount', async () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      const { unmount } = renderHook(() =>
        useSyncTask({ engine: mockEngine as any, enabled: true, intervalMs: 1000 }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('web platform handling', () => {
    it('should warn and return early on web platform', async () => {
      const originalPlatform = Platform.OS;
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      try {
        // Mock Platform.OS as web
        Object.defineProperty(Platform, 'OS', {
          get: () => 'web',
          configurable: true,
        });

        const { result } = renderHook(() =>
          useSyncTask({ engine: mockEngine as any, enabled: true }),
        );

        await act(async () => {
          await result.current.triggerSync();
        });

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            '[Sync] Sync is not supported on web platform. Database operations require native SQLite.',
          ),
          expect.anything(),
        );
        expect(mockEngine.runSync).not.toHaveBeenCalled();
        expect(BackgroundTask.registerTaskAsync).not.toHaveBeenCalled();
      } finally {
        // Restore original platform
        Object.defineProperty(Platform, 'OS', {
          get: () => originalPlatform,
          configurable: true,
        });
        consoleWarnSpy.mockRestore();
      }
    });

    it('should skip unregister when disabled on web', async () => {
      const originalPlatform = Platform.OS;

      try {
        Object.defineProperty(Platform, 'OS', {
          get: () => 'web',
          configurable: true,
        });

        const { rerender } = renderHook(
          (props: { enabled: boolean }) =>
            useSyncTask({ engine: mockEngine as any, enabled: props.enabled }),
          { initialProps: { enabled: true } },
        );

        await act(async () => {
          await Promise.resolve();
        });

        jest.clearAllMocks();

        rerender({ enabled: false });

        await act(async () => {
          await Promise.resolve();
        });

        expect(BackgroundTask.unregisterTaskAsync).not.toHaveBeenCalled();
      } finally {
        Object.defineProperty(Platform, 'OS', {
          get: () => originalPlatform,
          configurable: true,
        });
      }
    });
  });

  describe('registerTask callback', () => {
    it('should return Success when task executes successfully', async () => {
      renderHook(() => useSyncTask({ engine: mockEngine as any, enabled: true }));

      await waitFor(() => {
        expect(definedTasks[DOMAIN.app.syncTask]).toBeDefined();
      });

      mockEngine.runSync.mockResolvedValueOnce(undefined);

      const result = await definedTasks[DOMAIN.app.syncTask]!();

      expect(result).toBe(BackgroundTask.BackgroundTaskResult.Success);
    });

    it('should return Failed when task execution throws error', async () => {
      renderHook(() => useSyncTask({ engine: mockEngine as any, enabled: true }));

      await waitFor(() => {
        expect(definedTasks[DOMAIN.app.syncTask]).toBeDefined();
      });

      mockEngine.runSync.mockRejectedValueOnce(new Error('Task failed'));

      const result = await definedTasks[DOMAIN.app.syncTask]!();

      expect(result).toBe(BackgroundTask.BackgroundTaskResult.Failed);
    });
  });

  describe('edge cases', () => {
    it('should handle sync after unmount gracefully', async () => {
      const { result, unmount } = renderHook(() =>
        useSyncTask({ engine: mockEngine as any, enabled: true, autoStart: false }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      mockEngine.runSync.mockClear();
      unmount();

      await act(async () => {
        await result.current.triggerSync();
      });

      // Should not run sync after unmount
      expect(mockEngine.runSync).not.toHaveBeenCalled();
    });
  });
});
