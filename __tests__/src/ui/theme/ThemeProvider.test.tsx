import { DOMAIN } from '@/config/domain.config';
import { themePalettes } from '@/ui/theme/palette';
import { getThemePalette, ThemeProvider, useThemeContext } from '@/ui/theme/ThemeProvider';
import { act, renderHook } from '@testing-library/react-native';
import React, { PropsWithChildren } from 'react';
import { Appearance, Platform } from 'react-native';

jest.mock('react-native-mmkv', () => {
  const store = new Map<string, string>();
  const MMKV = jest.fn(() => ({
    getString: jest.fn((key: string) => (store.has(key) ? store.get(key)! : null)),
    set: jest.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    delete: jest.fn((key: string) => {
      store.delete(key);
    }),
  }));

  return {
    MMKV,
    __store: store,
  };
});

describe('ThemeProvider', () => {
  let mockColorScheme: 'light' | 'dark' | null;
  let mockListeners: ((preferences: { colorScheme: 'light' | 'dark' | null }) => void)[];
  let storage: Record<string, string>;
  const originalPlatform = Platform.OS;
  const originalLocalStorage = globalThis.localStorage;

  beforeEach(() => {
    jest.clearAllMocks();
    mockColorScheme = 'dark';
    mockListeners = [];
    storage = {};

    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'web',
    });

    const localStorageMock: Storage = {
      getItem: (key: string) => (key in storage ? storage[key] : null),
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        storage = {};
      },
      key: (index: number) => Object.keys(storage)[index] ?? null,
      get length() {
        return Object.keys(storage).length;
      },
    };

    globalThis.localStorage = localStorageMock;

    // Mock Appearance API
    jest.spyOn(Appearance, 'getColorScheme').mockImplementation(() => mockColorScheme);
    jest.spyOn(Appearance, 'addChangeListener').mockImplementation((listener) => {
      mockListeners.push(listener);
      return {
        remove: jest.fn(() => {
          const index = mockListeners.indexOf(listener);
          if (index > -1) {
            mockListeners.splice(index, 1);
          }
        }),
      };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalPlatform,
    });
    globalThis.localStorage = originalLocalStorage;
  });

  const wrapper = ({ children }: PropsWithChildren) => <ThemeProvider>{children}</ThemeProvider>;

  const expectedLightPalette = themePalettes.light;
  const expectedDarkPalette = themePalettes.dark;

  describe('Provider Rendering', () => {
    it('should provide theme context to children', () => {
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.preference).toBe('system');
      expect(result.current.setPreference).toBeDefined();
      expect(result.current.palette).toBeDefined();
      expect(result.current.resolvedTheme).toBe('dark');
    });

    it('should initialize with system preference by default', () => {
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      expect(result.current.preference).toBe('system');
      expect(result.current.resolvedTheme).toBe('dark');
    });

    it('should initialize system theme based on Appearance.getColorScheme', () => {
      mockColorScheme = 'light';
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      // Default theme is 'dark', but if we set it to 'system', it should use light
      act(() => {
        result.current.setPreference('system');
      });

      expect(result.current.resolvedTheme).toBe('light');
    });
  });

  describe('useThemeContext Hook', () => {
    it('should throw error when used outside ThemeProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        renderHook(() => useThemeContext());
      }).toThrow('useThemeContext must be used within a ThemeProvider');

      consoleSpy.mockRestore();
    });

    it('should return theme context value', () => {
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      expect(result.current).toMatchObject({
        preference: expect.any(String),
        setPreference: expect.any(Function),
        palette: expect.any(Object),
        resolvedTheme: expect.any(String),
      });
    });
  });

  describe('Theme Setting', () => {
    it('should set theme to light', () => {
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      act(() => {
        result.current.setPreference('light');
      });

      expect(result.current.preference).toBe('light');
      expect(result.current.resolvedTheme).toBe('light');
    });

    it('should set theme to dark', () => {
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      act(() => {
        result.current.setPreference('light');
      });
      act(() => {
        result.current.setPreference('dark');
      });

      expect(result.current.preference).toBe('dark');
      expect(result.current.resolvedTheme).toBe('dark');
    });

    it('should set theme to system', () => {
      mockColorScheme = 'light';
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      act(() => {
        result.current.setPreference('system');
      });

      expect(result.current.preference).toBe('system');
      expect(result.current.resolvedTheme).toBe('light');
    });
  });

  describe('Theme Resolution', () => {
    it('should resolve light theme to light palette', () => {
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      act(() => {
        result.current.setPreference('light');
      });

      expect(result.current.palette).toEqual(expectedLightPalette);
    });

    it('should resolve dark theme to dark palette', () => {
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      act(() => {
        result.current.setPreference('dark');
      });

      expect(result.current.palette).toEqual(expectedDarkPalette);
    });

    it('should resolve system theme to light palette when system is light', () => {
      mockColorScheme = 'light';
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      act(() => {
        result.current.setPreference('system');
      });

      expect(result.current.resolvedTheme).toBe('light');
      expect(result.current.palette).toEqual(expectedLightPalette);
    });

    it('should resolve system theme to dark palette when system is dark', () => {
      mockColorScheme = 'dark';
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      act(() => {
        result.current.setPreference('system');
      });

      expect(result.current.resolvedTheme).toBe('dark');
      expect(result.current.palette).toEqual(expectedDarkPalette);
    });
  });

  describe('System Theme Changes', () => {
    it('should update resolved theme when system theme changes from light to dark', () => {
      mockColorScheme = 'light';
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      act(() => {
        result.current.setPreference('system');
      });

      expect(result.current.resolvedTheme).toBe('light');

      // Simulate system theme change
      act(() => {
        mockListeners.forEach((listener) => listener({ colorScheme: 'dark' }));
      });

      expect(result.current.resolvedTheme).toBe('dark');
      expect(result.current.palette.background).toBe('#0F172A');
    });

    it('should update resolved theme when system theme changes from dark to light', () => {
      mockColorScheme = 'dark';
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      act(() => {
        result.current.setPreference('system');
      });

      expect(result.current.resolvedTheme).toBe('dark');

      // Simulate system theme change
      act(() => {
        mockListeners.forEach((listener) => listener({ colorScheme: 'light' }));
      });

      expect(result.current.resolvedTheme).toBe('light');
      expect(result.current.palette.background).toBe('#FFFFFF');
    });

    it('should ignore null colorScheme changes', () => {
      mockColorScheme = 'dark';
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      act(() => {
        result.current.setPreference('system');
      });

      const initialTheme = result.current.resolvedTheme;

      // Simulate null colorScheme event
      act(() => {
        mockListeners.forEach((listener) => listener({ colorScheme: null }));
      });

      expect(result.current.resolvedTheme).toBe(initialTheme);
    });

    it('should not affect resolved theme when user theme is not system', () => {
      mockColorScheme = 'dark';
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      act(() => {
        result.current.setPreference('light');
      });

      expect(result.current.resolvedTheme).toBe('light');

      // Simulate system theme change
      act(() => {
        mockListeners.forEach((listener) => listener({ colorScheme: 'dark' }));
      });

      // Should still be light because user explicitly chose light
      expect(result.current.resolvedTheme).toBe('light');
    });
  });

  describe('Subscription Cleanup', () => {
    it('should clean up appearance listener on unmount', () => {
      const { unmount } = renderHook(() => useThemeContext(), { wrapper });

      expect(mockListeners.length).toBe(1);

      unmount();

      expect(mockListeners.length).toBe(0);
    });
  });

  describe('getThemePalette Utility', () => {
    it('should return light palette for light theme', () => {
      const palette = getThemePalette('light');

      expect(palette).toEqual(expectedLightPalette);
    });

    it('should return dark palette for dark theme', () => {
      const palette = getThemePalette('dark');

      expect(palette).toEqual(expectedDarkPalette);
    });

    it('should return light palette for system theme when system is light', () => {
      mockColorScheme = 'light';
      const palette = getThemePalette('system');

      expect(palette).toEqual(expectedLightPalette);
    });

    it('should return dark palette for system theme when system is dark', () => {
      mockColorScheme = 'dark';
      const palette = getThemePalette('system');

      expect(palette).toEqual(expectedDarkPalette);
    });

    it('should default to light palette when system colorScheme is null', () => {
      mockColorScheme = null;
      const palette = getThemePalette('system');

      expect(palette).toEqual(expectedLightPalette);
    });
  });

  describe('Palette Values', () => {
    it('should have correct light palette values', () => {
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      act(() => {
        result.current.setPreference('light');
      });

      expect(result.current.palette.background).toBe(expectedLightPalette.background);
      expect(result.current.palette.text).toBe(expectedLightPalette.text);
      expect(result.current.palette.mutedText).toBe(expectedLightPalette.mutedText);
    });

    it('should have correct dark palette values', () => {
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      act(() => {
        result.current.setPreference('dark');
      });

      expect(result.current.palette.background).toBe(expectedDarkPalette.background);
      expect(result.current.palette.text).toBe(expectedDarkPalette.text);
      expect(result.current.palette.mutedText).toBe(expectedDarkPalette.mutedText);
    });
  });

  describe('native persistence (MMKV)', () => {
    const STORAGE_KEY = `${DOMAIN.app.storageKey}-theme-preference`;
    const platformWebDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');

    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', {
        configurable: true,
        value: 'ios',
      });

      const mmkvModule = require('react-native-mmkv');
      mmkvModule.__store.clear();
      mmkvModule.MMKV.mockClear();
    });

    afterEach(() => {
      if (platformWebDescriptor) {
        Object.defineProperty(Platform, 'OS', platformWebDescriptor);
      }
    });

    it('hydrates preference from MMKV storage', () => {
      const mmkvModule = require('react-native-mmkv');
      mmkvModule.__store.set(STORAGE_KEY, 'dark');

      const { result } = renderHook(() => useThemeContext(), { wrapper });

      expect(mmkvModule.MMKV).toHaveBeenCalled();
      expect(result.current.preference).toBe('dark');
      expect(result.current.resolvedTheme).toBe('dark');
    });

    it('persists preference via MMKV storage', () => {
      const mmkvModule = require('react-native-mmkv');

      const { result } = renderHook(() => useThemeContext(), { wrapper });

      act(() => {
        result.current.setPreference('light');
      });

      const persistCall =
        mmkvModule.MMKV.mock.results[mmkvModule.MMKV.mock.results.length - 1].value;
      expect(persistCall.set).toHaveBeenCalledWith(STORAGE_KEY, 'light');
      expect(mmkvModule.__store.get(STORAGE_KEY)).toBe('light');
    });
  });

  describe('Context Value Memoization', () => {
    it('should memoize context value when theme does not change', () => {
      const { result, rerender } = renderHook(() => useThemeContext(), { wrapper });

      const firstValue = result.current;
      rerender(undefined);
      const secondValue = result.current;

      expect(firstValue).toBe(secondValue);
    });

    it('should update context value when theme changes', () => {
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      const firstValue = result.current;

      act(() => {
        result.current.setPreference('light');
      });

      const secondValue = result.current;

      expect(firstValue).not.toBe(secondValue);
    });

    it('should update context value when system theme changes and user theme is system', () => {
      mockColorScheme = 'light';
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      act(() => {
        result.current.setPreference('system');
      });

      const firstValue = result.current;

      act(() => {
        mockListeners.forEach((listener) => listener({ colorScheme: 'dark' }));
      });

      const secondValue = result.current;

      expect(firstValue).not.toBe(secondValue);
    });
  });
});
