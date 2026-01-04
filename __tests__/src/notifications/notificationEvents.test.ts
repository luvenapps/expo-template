import { emitNotificationEvent, onNotificationEvent } from '@/notifications/notificationEvents';

describe('notificationEvents', () => {
  // Clear all listeners between tests to ensure isolation
  let cleanupFunctions: (() => void)[] = [];
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // Clean up any lingering listeners from previous tests
    cleanupFunctions.forEach((cleanup) => cleanup());
    cleanupFunctions = [];
    // Suppress console.error in all tests (we explicitly test error handling)
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    // Final cleanup
    cleanupFunctions.forEach((cleanup) => cleanup());
    cleanupFunctions = [];
    // Restore console.error
    consoleErrorSpy.mockRestore();
  });

  describe('onNotificationEvent', () => {
    it('should register a listener and call it when event is emitted', () => {
      const listener = jest.fn();
      const unsubscribe = onNotificationEvent('entry-created', listener);
      cleanupFunctions.push(unsubscribe);

      emitNotificationEvent('entry-created', 'test-context');

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith('test-context');
    });

    it('should register multiple listeners for the same event', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      const unsubscribe1 = onNotificationEvent('entry-created', listener1);
      const unsubscribe2 = onNotificationEvent('entry-created', listener2);
      cleanupFunctions.push(unsubscribe1, unsubscribe2);

      emitNotificationEvent('entry-created', 'multi-listener');

      expect(listener1).toHaveBeenCalledWith('multi-listener');
      expect(listener2).toHaveBeenCalledWith('multi-listener');
    });

    it('should return an unsubscribe function that removes the listener', () => {
      const listener = jest.fn();
      const unsubscribe = onNotificationEvent('entry-created', listener);

      unsubscribe();
      emitNotificationEvent('entry-created', 'after-unsubscribe');

      expect(listener).not.toHaveBeenCalled();
    });

    it('should allow multiple unsubscribes without error', () => {
      const listener = jest.fn();
      const unsubscribe = onNotificationEvent('entry-created', listener);

      unsubscribe();
      unsubscribe(); // Call twice

      emitNotificationEvent('entry-created', 'test');
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('emitNotificationEvent', () => {
    it('should not throw when no listeners are registered', () => {
      expect(() => {
        emitNotificationEvent('entry-created', 'no-listeners');
      }).not.toThrow();
    });

    it('should return early when no listeners exist', () => {
      // Emit event that has never had listeners registered
      const result = emitNotificationEvent('entry-created', 'test-context');
      // Should complete without error and return undefined (implicit)
      expect(result).toBeUndefined();
    });

    it('should handle listener errors gracefully', () => {
      const throwingListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      const normalListener = jest.fn();

      const unsubscribe1 = onNotificationEvent('entry-created', throwingListener);
      const unsubscribe2 = onNotificationEvent('entry-created', normalListener);
      cleanupFunctions.push(unsubscribe1, unsubscribe2);

      emitNotificationEvent('entry-created', 'error-context');

      expect(throwingListener).toHaveBeenCalled();
      expect(normalListener).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[NotificationEvents] Error in entry-created listener:'),
        expect.any(Error),
      );
    });

    it('should pass context to all listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const listener3 = jest.fn();

      const unsubscribe1 = onNotificationEvent('entry-created', listener1);
      const unsubscribe2 = onNotificationEvent('entry-created', listener2);
      const unsubscribe3 = onNotificationEvent('entry-created', listener3);
      cleanupFunctions.push(unsubscribe1, unsubscribe2, unsubscribe3);

      const context = 'specific-context-value';
      emitNotificationEvent('entry-created', context);

      expect(listener1).toHaveBeenCalledWith(context);
      expect(listener2).toHaveBeenCalledWith(context);
      expect(listener3).toHaveBeenCalledWith(context);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle subscribe, emit, unsubscribe, emit sequence', () => {
      const listener = jest.fn();
      const unsubscribe = onNotificationEvent('entry-created', listener);

      emitNotificationEvent('entry-created', 'first-call');
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();

      emitNotificationEvent('entry-created', 'second-call');
      expect(listener).toHaveBeenCalledTimes(1); // Still only called once
    });

    it('should handle partial unsubscribe (only one listener removed)', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      const unsubscribe1 = onNotificationEvent('entry-created', listener1);
      const unsubscribe2 = onNotificationEvent('entry-created', listener2);
      cleanupFunctions.push(unsubscribe2); // Only track listener2 for cleanup

      unsubscribe1();

      emitNotificationEvent('entry-created', 'partial-unsubscribe');

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledWith('partial-unsubscribe');
    });
  });
});
