// Set up platform and storage mocks before importing the module
const platformModule = { Platform: { OS: 'ios' as 'ios' | 'android' | 'web' } };

jest.mock('react-native', () => platformModule);

// Mock MMKV
const mockMMKVInstance = {
  getString: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
};

const mockMMKV = jest.fn(() => mockMMKVInstance);

jest.mock('react-native-mmkv', () => ({
  MMKV: mockMMKV,
}));

import * as store from '@/messaging/store';
import { act, renderHook } from '@testing-library/react-native';

describe('messaging/store', () => {
  beforeEach(() => {
    mockMMKVInstance.getString.mockReturnValue(null);
  });

  describe('setBroadcastMessage', () => {
    it('sets a new message', () => {
      const { result } = renderHook(() => store.useBroadcastState());

      const message = {
        id: 'msg-1',
        title: 'Test',
        body: 'Body',
        publishedAt: '2024-01-01',
      };

      act(() => {
        store.setBroadcastMessage(message);
      });

      expect(result.current.message?.id).toBe('msg-1');
    });

    it('sets a new message and clears its dismissed state', () => {
      const { result } = renderHook(() => store.useBroadcastState());

      const message = {
        id: 'msg-1',
        title: 'Test',
        body: 'Body',
        publishedAt: '2024-01-01',
      };

      // First dismiss the message
      act(() => {
        store.dismissBroadcastMessage('msg-1');
      });

      // Then set it again
      act(() => {
        store.setBroadcastMessage(message);
      });

      expect(result.current.message?.id).toBe('msg-1');
      expect(result.current.dismissed['msg-1']).toBeUndefined();
    });

    it('clears message when null is passed', () => {
      const { result } = renderHook(() => store.useBroadcastState());

      const message = {
        id: 'msg-2',
        title: 'Test',
        body: 'Body',
        publishedAt: '2024-01-01',
      };

      act(() => {
        store.setBroadcastMessage(message);
      });

      act(() => {
        store.setBroadcastMessage(null);
      });

      expect(result.current.message).toBeNull();
    });
  });

  describe('dismissBroadcastMessage', () => {
    it('adds message id to dismissed map with timestamp', () => {
      const { result } = renderHook(() => store.useBroadcastState());

      const beforeDismiss = new Date().toISOString();

      act(() => {
        store.dismissBroadcastMessage('msg-1');
      });

      const afterDismiss = new Date().toISOString();

      const dismissedAt = result.current.dismissed['msg-1'];

      expect(dismissedAt).toBeDefined();
      expect(dismissedAt >= beforeDismiss).toBe(true);
      expect(dismissedAt <= afterDismiss).toBe(true);
    });

    it('preserves other dismissed messages', () => {
      const { result } = renderHook(() => store.useBroadcastState());

      act(() => {
        store.dismissBroadcastMessage('msg-1');
      });

      act(() => {
        store.dismissBroadcastMessage('msg-2');
      });

      expect(result.current.dismissed['msg-1']).toBeDefined();
      expect(result.current.dismissed['msg-2']).toBeDefined();
    });
  });

  describe('clearBroadcastMessage', () => {
    it('clears the current message', () => {
      const { result } = renderHook(() => store.useBroadcastState());

      const message = {
        id: 'msg-1',
        title: 'Test',
        body: 'Body',
        publishedAt: '2024-01-01',
      };

      act(() => {
        store.setBroadcastMessage(message);
      });

      act(() => {
        store.clearBroadcastMessage();
      });

      expect(result.current.message).toBeNull();
    });

    it('preserves dismissed messages when clearing', () => {
      const { result } = renderHook(() => store.useBroadcastState());

      const message = {
        id: 'msg-1',
        title: 'Test',
        body: 'Body',
        publishedAt: '2024-01-01',
      };

      act(() => {
        store.setBroadcastMessage(message);
      });

      act(() => {
        store.dismissBroadcastMessage('msg-2');
      });

      act(() => {
        store.clearBroadcastMessage();
      });

      expect(result.current.message).toBeNull();
      expect(result.current.dismissed['msg-2']).toBeDefined();
    });
  });

  describe('useActiveBroadcastMessage', () => {
    it('returns null when there is no message', () => {
      // Clear any existing message first
      act(() => {
        store.clearBroadcastMessage();
      });

      const { result } = renderHook(() => store.useActiveBroadcastMessage());
      expect(result.current.message).toBeNull();
    });

    it('returns the message when it exists and is not dismissed', () => {
      const testMessage = {
        id: 'msg-active-1',
        title: 'Test',
        body: 'Body',
        publishedAt: '2024-01-01',
      };

      const { result } = renderHook(() => store.useActiveBroadcastMessage());

      act(() => {
        store.setBroadcastMessage(testMessage);
      });

      expect(result.current.message?.id).toBe('msg-active-1');
    });

    it('returns null when message is dismissed', () => {
      const testMessage = {
        id: 'msg-active-2',
        title: 'Test',
        body: 'Body',
        publishedAt: '2024-01-01',
      };

      const { result } = renderHook(() => store.useActiveBroadcastMessage());

      act(() => {
        store.setBroadcastMessage(testMessage);
      });

      act(() => {
        store.dismissBroadcastMessage('msg-active-2');
      });

      expect(result.current.message).toBeNull();
    });
  });

  describe('useBroadcastState', () => {
    it('provides reactive state updates', () => {
      const { result } = renderHook(() => store.useBroadcastState());

      const message1 = {
        id: 'reactive-1',
        title: 'First',
        body: 'Body',
        publishedAt: '2024-01-01',
      };

      act(() => {
        store.setBroadcastMessage(message1);
      });

      expect(result.current.message?.id).toBe('reactive-1');

      const message2 = {
        id: 'reactive-2',
        title: 'Second',
        body: 'Body',
        publishedAt: '2024-01-02',
      };

      act(() => {
        store.setBroadcastMessage(message2);
      });

      expect(result.current.message?.id).toBe('reactive-2');
    });
  });

  describe('Web platform localStorage', () => {
    it('uses localStorage on web platform', () => {
      const mockLocalStorage = {
        getItem: jest.fn(() => null),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      };

      Object.defineProperty(globalThis, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
        configurable: true,
      });

      platformModule.Platform.OS = 'web';

      jest.isolateModules(() => {
        const webStore = require('@/messaging/store');

        const message = {
          id: 'web-1',
          title: 'Web Message',
          body: 'Body',
          publishedAt: '2024-01-01',
        };

        webStore.setBroadcastMessage(message);

        // Should use localStorage.setItem instead of MMKV
        expect(mockLocalStorage.setItem).toHaveBeenCalled();
      });

      // Reset platform
      platformModule.Platform.OS = 'ios';
    });

    it('handles localStorage getItem errors gracefully on web', () => {
      const mockLocalStorage = {
        getItem: jest.fn(() => {
          throw new Error('Storage error');
        }),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      };

      Object.defineProperty(globalThis, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
        configurable: true,
      });

      platformModule.Platform.OS = 'web';

      // Should not throw when loading state fails
      expect(() => {
        jest.isolateModules(() => {
          require('@/messaging/store');
        });
      }).not.toThrow();

      platformModule.Platform.OS = 'ios';
    });

    it('handles localStorage setItem errors gracefully on web', () => {
      const mockLocalStorage = {
        getItem: jest.fn(() => null),
        setItem: jest.fn(() => {
          throw new Error('Storage error');
        }),
        removeItem: jest.fn(),
      };

      Object.defineProperty(globalThis, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
        configurable: true,
      });

      platformModule.Platform.OS = 'web';

      jest.isolateModules(() => {
        const webStore = require('@/messaging/store');

        // Should not throw even when setItem throws
        expect(() => {
          webStore.setBroadcastMessage({
            id: 'web-error',
            title: 'Test',
            body: 'Body',
            publishedAt: '2024-01-01',
          });
        }).not.toThrow();
      });

      platformModule.Platform.OS = 'ios';
    });

    it('handles localStorage removeItem errors gracefully on web', () => {
      const mockLocalStorage = {
        getItem: jest.fn(() => null),
        setItem: jest.fn(),
        removeItem: jest.fn(() => {
          throw new Error('Storage error');
        }),
      };

      Object.defineProperty(globalThis, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
        configurable: true,
      });

      platformModule.Platform.OS = 'web';

      jest.isolateModules(() => {
        const webStore = require('@/messaging/store');

        // clearBroadcastMessage should not throw even when removeItem throws
        expect(() => {
          webStore.clearBroadcastMessage();
        }).not.toThrow();
      });

      platformModule.Platform.OS = 'ios';
    });
  });

  describe('Memory fallback storage', () => {
    it('uses memory fallback when MMKV is not available', () => {
      // Temporarily break the MMKV mock to trigger fallback
      const brokenMMKV = jest.fn(() => {
        throw new Error('MMKV not available');
      });

      jest.doMock('react-native-mmkv', () => ({
        MMKV: brokenMMKV,
      }));

      platformModule.Platform.OS = 'ios';

      // Should fallback to memory storage without throwing
      expect(() => {
        jest.isolateModules(() => {
          const fallbackStore = require('@/messaging/store');

          // Should be able to set and retrieve messages using memory fallback
          fallbackStore.setBroadcastMessage({
            id: 'memory-1',
            title: 'Test',
            body: 'Body',
            publishedAt: '2024-01-01',
          });

          fallbackStore.clearBroadcastMessage();
        });
      }).not.toThrow();

      platformModule.Platform.OS = 'ios';
    });
  });

  describe('Storage edge cases', () => {
    it('handles corrupt JSON in storage gracefully', () => {
      mockMMKVInstance.getString.mockReturnValue('{ invalid json }');

      // Re-import to trigger initialization with corrupt data
      // Should not throw even with invalid JSON
      expect(() => {
        jest.isolateModules(() => {
          require('@/messaging/store');
        });
      }).not.toThrow();
    });

    it('handles empty storage gracefully', () => {
      mockMMKVInstance.getString.mockReturnValue(null);

      // Should not throw when storage is empty
      expect(() => {
        jest.isolateModules(() => {
          require('@/messaging/store');
        });
      }).not.toThrow();
    });

    it('handles stringified null storage gracefully', () => {
      mockMMKVInstance.getString.mockReturnValue('null');

      // Should not throw when storage contains null
      expect(() => {
        jest.isolateModules(() => {
          require('@/messaging/store');
        });
      }).not.toThrow();
    });
  });
});
