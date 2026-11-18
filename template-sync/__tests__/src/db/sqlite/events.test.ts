import { emitDatabaseReset, onDatabaseReset } from '@/db/sqlite/events';

describe('SQLite Events', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe('onDatabaseReset', () => {
    it('should register a listener and call it when database is reset', () => {
      const listener = jest.fn();

      onDatabaseReset(listener);
      emitDatabaseReset();

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should support multiple listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      onDatabaseReset(listener1);
      onDatabaseReset(listener2);
      emitDatabaseReset();

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('should return an unsubscribe function', () => {
      const listener = jest.fn();

      const unsubscribe = onDatabaseReset(listener);
      unsubscribe();
      emitDatabaseReset();

      expect(listener).not.toHaveBeenCalled();
    });

    it('should not fail if unsubscribe is called multiple times', () => {
      const listener = jest.fn();

      const unsubscribe = onDatabaseReset(listener);
      unsubscribe();
      unsubscribe(); // Should not throw

      emitDatabaseReset();
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('emitDatabaseReset', () => {
    it('should handle listener errors gracefully', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      const normalListener = jest.fn();

      onDatabaseReset(errorListener);
      onDatabaseReset(normalListener);

      emitDatabaseReset();

      expect(errorListener).toHaveBeenCalledTimes(1);
      expect(normalListener).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SQLite] Database reset listener failed:'),
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    it('should work when no listeners are registered', () => {
      // Should not throw
      expect(() => emitDatabaseReset()).not.toThrow();
    });
  });
});
