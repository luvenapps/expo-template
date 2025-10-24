import { render } from '@testing-library/react-native';
import React, { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useSyncManager } from '@/sync/useSyncManager';

jest.useFakeTimers();

const listeners: ((state: AppStateStatus) => void)[] = [];

const engine = {
  runSync: jest.fn().mockResolvedValue(undefined),
};

let triggerRef: (() => Promise<void>) | null = null;
let addEventListenerSpy: jest.SpyInstance;

const TestComponent = ({ enabled = true }: { enabled?: boolean }) => {
  const result = useSyncManager({ engine: engine as any, intervalMs: 1000, enabled });

  useEffect(() => {
    triggerRef = result.triggerSync;
  }, [result.triggerSync]);

  return null;
};

describe('useSyncManager', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    engine.runSync.mockClear();
    listeners.length = 0;
    triggerRef = null;

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

  test('runs on mount when enabled', async () => {
    render(<TestComponent enabled />);
    await Promise.resolve();
    expect(engine.runSync).toHaveBeenCalledTimes(1);
  });

  test('runs on interval', async () => {
    render(<TestComponent enabled />);
    await Promise.resolve();
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    expect(engine.runSync).toHaveBeenCalledTimes(2);
  });

  test('runs when app state becomes active', async () => {
    render(<TestComponent enabled />);
    await Promise.resolve();
    listeners.forEach((listener) => listener('active'));
    await Promise.resolve();
    expect(engine.runSync).toHaveBeenCalledTimes(2);
  });

  test('triggerSync manually invokes engine', async () => {
    render(<TestComponent enabled />);
    await Promise.resolve();
    await triggerRef?.();
    expect(engine.runSync).toHaveBeenCalledTimes(2);
  });

  test('manual trigger still runs when disabled', async () => {
    render(<TestComponent enabled={false} />);
    await Promise.resolve();
    await triggerRef?.();
    expect(engine.runSync).toHaveBeenCalledTimes(1);
  });

  test('does not run on mount when autoStart is false', async () => {
    const TestComponentNoAutoStart = () => {
      useSyncManager({ engine: engine as any, intervalMs: 1000, enabled: true, autoStart: false });
      return null;
    };
    render(<TestComponentNoAutoStart />);
    await Promise.resolve();
    expect(engine.runSync).not.toHaveBeenCalled();
  });

  test('does not run on non-active app state changes', async () => {
    render(<TestComponent enabled />);
    await Promise.resolve();
    engine.runSync.mockClear();

    // Trigger background state
    listeners.forEach((listener) => listener('background'));
    await Promise.resolve();
    expect(engine.runSync).not.toHaveBeenCalled();

    // Trigger inactive state
    listeners.forEach((listener) => listener('inactive'));
    await Promise.resolve();
    expect(engine.runSync).not.toHaveBeenCalled();
  });

  test('handles engine errors gracefully during auto-sync', async () => {
    engine.runSync.mockRejectedValueOnce(new Error('Sync failed'));
    render(<TestComponent enabled />);
    await Promise.resolve();
    // Should not throw during automatic sync
    expect(engine.runSync).toHaveBeenCalledTimes(1);
  });

  test('manual trigger runs even when disabled', async () => {
    render(<TestComponent enabled={false} />);
    await Promise.resolve();
    engine.runSync.mockClear();
    await triggerRef?.();
    expect(engine.runSync).toHaveBeenCalledTimes(1);
  });

  test('cleans up interval and listener on unmount', () => {
    const { unmount } = render(<TestComponent enabled />);
    expect(listeners.length).toBe(1);
    unmount();
    expect(listeners.length).toBe(0);
  });

  test('handles legacy addEventListener API', async () => {
    addEventListenerSpy.mockRestore();

    const legacyListeners: ((state: AppStateStatus) => void)[] = [];
    const legacyAddEventListener = jest.fn(
      (_type: string, handler: (state: AppStateStatus) => void) => {
        legacyListeners.push(handler);
      },
    );

    // Mock legacy API (no return value)
    Object.defineProperty(AppState, 'addEventListener', {
      value: undefined,
      configurable: true,
    });
    (AppState as any).addEventListener = legacyAddEventListener;

    render(<TestComponent enabled />);
    await Promise.resolve();

    expect(legacyAddEventListener).toHaveBeenCalledWith('change', expect.any(Function));

    // Trigger the legacy listener
    legacyListeners.forEach((listener) => listener('active'));
    await Promise.resolve();
    expect(engine.runSync).toHaveBeenCalledTimes(2); // mount + active
  });
});
