import { afterEach, describe, expect, test } from '@jest/globals';

type CursorModule = typeof import('@/sync/cursors');

const loadModule = () => {
  let moduleExports: CursorModule | undefined;
  jest.isolateModules(() => {
    moduleExports = require('@/sync/cursors');
  });
  return moduleExports!;
};

afterEach(() => {
  jest.resetModules();
  jest.dontMock('react-native');
  jest.dontMock('react-native-mmkv');
});

describe('cursor storage fallback', () => {
  test('uses in-memory adapter when MMKV throws', () => {
    jest.doMock('react-native-mmkv', () => {
      throw new Error('MMKV not available');
    });

    const { getCursor, setCursor, clearCursor, resetCursors } = loadModule();
    expect(getCursor('test')).toBeNull();
    setCursor('test', 'value');
    expect(getCursor('test')).toBe('value');
    clearCursor('test');
    expect(getCursor('test')).toBeNull();
    resetCursors();
    expect(getCursor('test')).toBeNull();
  });
});

describe('cursor storage with MMKV', () => {
  test('delegates to MMKV on native platforms', () => {
    const getString = jest.fn().mockReturnValue('stored');
    const set = jest.fn();
    const del = jest.fn();
    const clearAll = jest.fn();

    jest.doMock('react-native', () => ({ Platform: { OS: 'ios' } }), { virtual: true });
    jest.doMock('react-native-mmkv', () => ({
      MMKV: jest.fn(() => ({ getString, set, delete: del, clearAll })),
    }));

    const { setCursor, getCursor, clearCursor, resetCursors } = loadModule();

    setCursor('test', 'value');
    expect(set).toHaveBeenCalledWith('test', 'value');
    expect(getCursor('test')).toBe('stored');
    clearCursor('test');
    expect(del).toHaveBeenCalledWith('test');
    resetCursors();
    expect(clearAll).toHaveBeenCalled();
  });

  test('handles MMKV getString returning null', () => {
    const getString = jest.fn().mockReturnValue(null);
    const set = jest.fn();
    const del = jest.fn();
    const clearAll = jest.fn();

    jest.doMock('react-native', () => ({ Platform: { OS: 'ios' } }), { virtual: true });
    jest.doMock('react-native-mmkv', () => ({
      MMKV: jest.fn(() => ({ getString, set, delete: del, clearAll })),
    }));

    const { getCursor } = loadModule();

    expect(getCursor('nonexistent')).toBeNull();
    expect(getString).toHaveBeenCalledWith('nonexistent');
  });

  test('falls back to memory on web despite MMKV', () => {
    jest.doMock('react-native', () => ({ Platform: { OS: 'web' } }), { virtual: true });
    jest.doMock('react-native-mmkv', () => ({
      MMKV: jest.fn(() => ({
        getString: jest.fn().mockReturnValue('should-not-be-used'),
        set: jest.fn(),
        delete: jest.fn(),
        clearAll: jest.fn(),
      })),
    }));

    const { setCursor, getCursor } = loadModule();
    setCursor('test', 'memory');
    expect(getCursor('test')).toBe('memory');
  });
});
