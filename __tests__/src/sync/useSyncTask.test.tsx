jest.useFakeTimers();

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
  registerTaskAsync: jest.fn().mockResolvedValue(undefined),
  unregisterTaskAsync: jest.fn().mockResolvedValue(undefined),
  isTaskDefined: jest.fn().mockReturnValue(false),
}));

import { DOMAIN } from '@/config/domain.config';
import { useSyncTask } from '@/sync/useSyncTask';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as BackgroundTask from 'expo-background-task';
import { isTaskDefined, registerTaskAsync, unregisterTaskAsync } from 'expo-task-manager';
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
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    listeners.length = 0;
    mockEngine.runSync.mockReset();
    mockEngine.runSync.mockResolvedValue(undefined);

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
  });

  afterEach(() => {
    addEventListenerSpy?.mockRestore();
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

      // Mock legacy API - set addEventListener to a non-function to trigger else branch
      Object.defineProperty(AppState, 'addEventListener', {
        value: undefined,
        configurable: true,
      });
      (AppState as any).addEventListener = legacyAddEventListener;

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
  });

  describe('run coordination & backoff', () => {
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
        '[Sync] Background tasks are disabled or restricted. Skipping registration.',
      );

      warnSpy.mockRestore();
      (BackgroundTask.getStatusAsync as jest.Mock).mockResolvedValue(2);
    });

    it('should register task with expo-task-manager when not defined', async () => {
      (isTaskDefined as jest.Mock).mockReturnValue(false);

      renderHook(() => useSyncTask({ engine: mockEngine as any, enabled: true }));

      await waitFor(() => {
        expect(registerTaskAsync).toHaveBeenCalled();
      });
    });

    it('should not register task again if already defined', async () => {
      (isTaskDefined as jest.Mock).mockReturnValue(true);

      renderHook(() => useSyncTask({ engine: mockEngine as any, enabled: true }));

      await waitFor(() => {
        expect(BackgroundTask.registerTaskAsync).toHaveBeenCalled();
      });

      expect(registerTaskAsync).not.toHaveBeenCalled();
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
        expect(unregisterTaskAsync).toHaveBeenCalled();
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
      expect(unregisterTaskAsync).not.toHaveBeenCalled();

      statusMock.mockResolvedValue(2);
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

    it('should handle registerTask errors gracefully', async () => {
      (registerTaskAsync as jest.Mock).mockRejectedValueOnce(new Error('Register failed'));
      (isTaskDefined as jest.Mock).mockReturnValue(false);

      renderHook(() => useSyncTask({ engine: mockEngine as any, enabled: true }));

      await waitFor(() => {
        expect(registerTaskAsync).toHaveBeenCalled();
      });

      // Should not throw - error is caught silently with .catch(() => undefined)
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
        '[Sync] Failed to register background task:',
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
          'Sync is not supported on web platform. Database operations require native SQLite.',
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
  });

  describe('registerTask callback', () => {
    it('should return Success when task executes successfully', async () => {
      const taskCallback = jest.fn();
      (registerTaskAsync as jest.Mock).mockImplementation((_name, callback) => {
        taskCallback.mockImplementation(callback);
        return Promise.resolve();
      });
      (isTaskDefined as jest.Mock).mockReturnValue(false);

      renderHook(() => useSyncTask({ engine: mockEngine as any, enabled: true }));

      await waitFor(() => {
        expect(registerTaskAsync).toHaveBeenCalled();
      });

      mockEngine.runSync.mockResolvedValueOnce(undefined);

      const result = await taskCallback();

      expect(result).toBe(BackgroundTask.BackgroundTaskResult.Success);
    });

    it('should return Failed when task execution throws error', async () => {
      const taskCallback = jest.fn();
      (registerTaskAsync as jest.Mock).mockImplementation((_name, callback) => {
        taskCallback.mockImplementation(callback);
        return Promise.resolve();
      });
      (isTaskDefined as jest.Mock).mockReturnValue(false);

      renderHook(() => useSyncTask({ engine: mockEngine as any, enabled: true }));

      await waitFor(() => {
        expect(registerTaskAsync).toHaveBeenCalled();
      });

      mockEngine.runSync.mockRejectedValueOnce(new Error('Task failed'));

      const result = await taskCallback();

      expect(result).toBe(BackgroundTask.BackgroundTaskResult.Failed);
    });
  });
});
