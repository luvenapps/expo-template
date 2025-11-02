import { getThemePalette, ThemeProvider, useThemeContext } from '@/ui/theme/ThemeProvider';
import { act, renderHook } from '@testing-library/react-native';
import React, { PropsWithChildren } from 'react';
import { Appearance } from 'react-native';

describe('ThemeProvider', () => {
  let mockColorScheme: 'light' | 'dark' | null;
  let mockListeners: ((preferences: { colorScheme: 'light' | 'dark' | null }) => void)[];

  beforeEach(() => {
    jest.clearAllMocks();
    mockColorScheme = 'dark';
    mockListeners = [];

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
  });

  const wrapper = ({ children }: PropsWithChildren) => <ThemeProvider>{children}</ThemeProvider>;

  describe('Provider Rendering', () => {
    it('should provide theme context to children', () => {
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.theme).toBe('dark');
      expect(result.current.setTheme).toBeDefined();
      expect(result.current.palette).toBeDefined();
      expect(result.current.resolvedTheme).toBe('dark');
    });

    it('should initialize with dark theme by default', () => {
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      expect(result.current.theme).toBe('dark');
      expect(result.current.resolvedTheme).toBe('dark');
    });

    it('should initialize system theme based on Appearance.getColorScheme', () => {
      mockColorScheme = 'light';
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      // Default theme is 'dark', but if we set it to 'system', it should use light
      act(() => {
        result.current.setTheme('system');
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
        theme: expect.any(String),
        setTheme: expect.any(Function),
        palette: expect.any(Object),
        resolvedTheme: expect.any(String),
      });
    });
  });

  describe('Theme Setting', () => {
    it('should set theme to light', () => {
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      act(() => {
        result.current.setTheme('light');
      });

      expect(result.current.theme).toBe('light');
      expect(result.current.resolvedTheme).toBe('light');
    });

    it('should set theme to dark', () => {
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      act(() => {
        result.current.setTheme('light');
      });
      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.theme).toBe('dark');
      expect(result.current.resolvedTheme).toBe('dark');
    });

    it('should set theme to system', () => {
      mockColorScheme = 'light';
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      act(() => {
        result.current.setTheme('system');
      });

      expect(result.current.theme).toBe('system');
      expect(result.current.resolvedTheme).toBe('light');
    });
  });

  describe('Theme Resolution', () => {
    it('should resolve light theme to light palette', () => {
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      act(() => {
        result.current.setTheme('light');
      });

      expect(result.current.palette).toEqual({
        background: '#FFFFFF',
        text: '#0F172A',
        mutedText: '#475569',
      });
    });

    it('should resolve dark theme to dark palette', () => {
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.palette).toEqual({
        background: '#1a1a1a',
        text: '#FFFFFF',
        mutedText: '#E2E8F0',
      });
    });

    it('should resolve system theme to light palette when system is light', () => {
      mockColorScheme = 'light';
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      act(() => {
        result.current.setTheme('system');
      });

      expect(result.current.resolvedTheme).toBe('light');
      expect(result.current.palette).toEqual({
        background: '#FFFFFF',
        text: '#0F172A',
        mutedText: '#475569',
      });
    });

    it('should resolve system theme to dark palette when system is dark', () => {
      mockColorScheme = 'dark';
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      act(() => {
        result.current.setTheme('system');
      });

      expect(result.current.resolvedTheme).toBe('dark');
      expect(result.current.palette).toEqual({
        background: '#1a1a1a',
        text: '#FFFFFF',
        mutedText: '#E2E8F0',
      });
    });
  });

  describe('System Theme Changes', () => {
    it('should update resolved theme when system theme changes from light to dark', () => {
      mockColorScheme = 'light';
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      act(() => {
        result.current.setTheme('system');
      });

      expect(result.current.resolvedTheme).toBe('light');

      // Simulate system theme change
      act(() => {
        mockListeners.forEach((listener) => listener({ colorScheme: 'dark' }));
      });

      expect(result.current.resolvedTheme).toBe('dark');
      expect(result.current.palette.background).toBe('#1a1a1a');
    });

    it('should update resolved theme when system theme changes from dark to light', () => {
      mockColorScheme = 'dark';
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      act(() => {
        result.current.setTheme('system');
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
        result.current.setTheme('system');
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
        result.current.setTheme('light');
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

      expect(palette).toEqual({
        background: '#FFFFFF',
        text: '#0F172A',
        mutedText: '#475569',
      });
    });

    it('should return dark palette for dark theme', () => {
      const palette = getThemePalette('dark');

      expect(palette).toEqual({
        background: '#1a1a1a',
        text: '#FFFFFF',
        mutedText: '#E2E8F0',
      });
    });

    it('should return light palette for system theme when system is light', () => {
      mockColorScheme = 'light';
      const palette = getThemePalette('system');

      expect(palette).toEqual({
        background: '#FFFFFF',
        text: '#0F172A',
        mutedText: '#475569',
      });
    });

    it('should return dark palette for system theme when system is dark', () => {
      mockColorScheme = 'dark';
      const palette = getThemePalette('system');

      expect(palette).toEqual({
        background: '#1a1a1a',
        text: '#FFFFFF',
        mutedText: '#E2E8F0',
      });
    });

    it('should default to light palette when system colorScheme is null', () => {
      mockColorScheme = null;
      const palette = getThemePalette('system');

      expect(palette).toEqual({
        background: '#FFFFFF',
        text: '#0F172A',
        mutedText: '#475569',
      });
    });
  });

  describe('Palette Values', () => {
    it('should have correct light palette values', () => {
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      act(() => {
        result.current.setTheme('light');
      });

      expect(result.current.palette.background).toBe('#FFFFFF');
      expect(result.current.palette.text).toBe('#0F172A');
      expect(result.current.palette.mutedText).toBe('#475569');
    });

    it('should have correct dark palette values', () => {
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.palette.background).toBe('#1a1a1a');
      expect(result.current.palette.text).toBe('#FFFFFF');
      expect(result.current.palette.mutedText).toBe('#E2E8F0');
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
        result.current.setTheme('light');
      });

      const secondValue = result.current;

      expect(firstValue).not.toBe(secondValue);
    });

    it('should update context value when system theme changes and user theme is system', () => {
      mockColorScheme = 'light';
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      act(() => {
        result.current.setTheme('system');
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
