import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';
import type { ColorSchemeName } from 'react-native';

export type ThemeName = 'light' | 'dark' | 'system';

type ThemePalette = {
  background: string;
  text: string;
  mutedText: string;
};

const PALETTES: Record<'light' | 'dark', ThemePalette> = {
  light: {
    background: '#FFFFFF',
    text: '#0F172A',
    mutedText: '#475569',
  },
  dark: {
    background: '#0F172A',
    text: '#E2E8F0',
    mutedText: '#94A3B8',
  },
};

type ThemeContextValue = {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  palette: ThemePalette;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setTheme] = useState<ThemeName>('dark');
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(
    Appearance.getColorScheme() === 'dark' ? 'dark' : 'light',
  );

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (!colorScheme) return;
      setSystemTheme(colorScheme === 'dark' ? 'dark' : 'light');
    });
    return () => {
      subscription.remove();
    };
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const resolvedTheme = theme === 'system' ? systemTheme : theme;
    return {
      theme,
      setTheme,
      palette: PALETTES[resolvedTheme],
    };
  }, [theme, systemTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
}

export function getThemePalette(theme: ThemeName) {
  const colorScheme = Appearance.getColorScheme() as ColorSchemeName;
  const resolvedTheme = theme === 'system' ? (colorScheme === 'dark' ? 'dark' : 'light') : theme;
  return PALETTES[resolvedTheme];
}
