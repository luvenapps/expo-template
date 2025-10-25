import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AppState, AppStateStatus, Platform } from 'react-native';
import * as BackgroundTask from 'expo-background-task';
import { registerTaskAsync, unregisterTaskAsync, isTaskDefined } from 'expo-task-manager';
import { useSyncTask } from '@/sync/useSyncTask';

jest.useFakeTimers();

// Mock expo modules
jest.mock('expo-background-task', () => ({
  BackgroundTaskResult: {
    Success: 1,
    Failed: 2,
  },
  BackgroundTaskStatus: {
    Available: 1,
    Restricted: 2,
  },
  registerTaskAsync: jest.fn().mockResolvedValue(undefined),
  unregisterTaskAsync: jest.fn().mockResolvedValue(undefined),
  getStatusAsync: jest.fn().mockResolvedValue(1), // Available
}));

jest.mock('expo-task-manager', () => ({
  registerTaskAsync: jest.fn().mockResolvedValue(undefined),
  unregisterTaskAsync: jest.fn().mockResolvedValue(undefined),
  isTaskDefined: jest.fn().mockReturnValue(false),
}));

const mockEngine = {
  runSync: jest.fn().mockResolvedValue(undefined),
};

const listeners: ((state: AppStateStatus) => void)[] = [];
let addEventListenerSpy: jest.SpyInstance;

describe('useSyncTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    listeners.length = 0;

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

  describe('background fetch', () => {
    it('should register background task when enabled', async () => {
      renderHook(() =>
        useSyncTask({ engine: mockEngine as any, enabled: true, backgroundInterval: 900 }),
      );

      await waitFor(() => {
        expect(BackgroundTask.registerTaskAsync).toHaveBeenCalledWith('betterhabits-sync-task', {
          minimumInterval: 900,
        });
      });
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

      (BackgroundTask.getStatusAsync as jest.Mock).mockResolvedValue(1); // Available

      // Disable
      rerender({ enabled: false });

      await waitFor(() => {
        expect(BackgroundTask.unregisterTaskAsync).toHaveBeenCalled();
        expect(unregisterTaskAsync).toHaveBeenCalled();
      });
    });

    it('should skip unregister when background task is restricted', async () => {
      (BackgroundTask.getStatusAsync as jest.Mock).mockResolvedValue(2); // Restricted

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

      // Should not throw - error is caught
    });

    it('should handle background task registration errors gracefully', async () => {
      (BackgroundTask.registerTaskAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Register failed'),
      );

      renderHook(() => useSyncTask({ engine: mockEngine as any, enabled: true }));

      await act(async () => {
        await Promise.resolve();
      });

      // Should not throw
      expect(BackgroundTask.registerTaskAsync).toHaveBeenCalled();
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
      (BackgroundTask.getStatusAsync as jest.Mock).mockResolvedValue(1); // Available

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
