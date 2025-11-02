import { Appearance, Platform } from 'react-native';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { DOMAIN } from '@/config/domain.config';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ThemeName = ThemePreference;
export type ResolvedTheme = 'light' | 'dark';

type ThemePalette = {
  background: string;
  text: string;
  mutedText: string;
};

const PALETTES: Record<ResolvedTheme, ThemePalette> = {
  light: {
    background: '#FFFFFF',
    text: '#0F172A',
    mutedText: '#475569',
  },
  dark: {
    background: '#1a1a1a',
    text: '#FFFFFF',
    mutedText: '#E2E8F0',
  },
};

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (theme: ThemePreference) => void;
  /** @deprecated use setPreference */
  setTheme: (theme: ThemePreference) => void;
  palette: ThemePalette;
  /** @deprecated use preference */
  theme: ThemePreference;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = `${DOMAIN.app.storageKey}-theme-preference`;
const STORAGE_NAMESPACE = `${DOMAIN.app.cursorStorageId}-theme`;

function resolveSystemTheme(colorScheme: 'light' | 'dark' | null | undefined): ResolvedTheme {
  return colorScheme === 'dark' ? 'dark' : 'light';
}

function loadStoredPreference(): ThemePreference {
  try {
    if (Platform.OS !== 'web') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { MMKV } = require('react-native-mmkv');
      const store = new MMKV({ id: STORAGE_NAMESPACE });
      const stored = store.getString(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
      }
    } else if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
      const stored = globalThis.localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
      }
    }
  } catch {
    // ignore persistence errors and fall back to system default
  }
  return 'system';
}

function persistPreference(preference: ThemePreference) {
  try {
    if (Platform.OS !== 'web') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { MMKV } = require('react-native-mmkv');
      const store = new MMKV({ id: STORAGE_NAMESPACE });
      store.set(STORAGE_KEY, preference);
    } else if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
      globalThis.localStorage.setItem(STORAGE_KEY, preference);
    }
  } catch {
    // ignore persistence errors
  }
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [preference, setPreferenceState] = useState<ThemePreference>(loadStoredPreference);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(
    resolveSystemTheme(Appearance.getColorScheme()),
  );

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (!colorScheme) return;
      setSystemTheme(resolveSystemTheme(colorScheme));
    });
    return () => {
      subscription.remove();
    };
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const resolvedTheme = preference === 'system' ? systemTheme : preference;
    const setPreference = (next: ThemePreference) => {
      setPreferenceState(next);
      persistPreference(next);
    };

    return {
      preference,
      resolvedTheme,
      setPreference,
      setTheme: setPreference,
      palette: PALETTES[resolvedTheme],
      theme: preference,
    };
  }, [preference, systemTheme]);

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
  const resolvedTheme =
    theme === 'system' ? resolveSystemTheme(Appearance.getColorScheme()) : (theme as ResolvedTheme);
  return PALETTES[resolvedTheme];
}
