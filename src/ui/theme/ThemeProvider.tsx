import { DOMAIN } from '@/config/domain.config';
import { themePalettes, ThemePalette } from '@/ui/theme/palette';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, Platform } from 'react-native';
import { analytics } from '@/observability/analytics';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ThemeName = ThemePreference;
export type ResolvedTheme = 'light' | 'dark';

const PALETTES: Record<ResolvedTheme, ThemePalette> = themePalettes;

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

function resolveWebSystemTheme(): ResolvedTheme {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      // fall through
    }
  }
  return 'light';
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
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => {
    if (Platform.OS === 'web') {
      return resolveWebSystemTheme();
    }
    return resolveSystemTheme(Appearance.getColorScheme());
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // mark hydrated after first mount so SSR/first paint can be suppressed if desired
    setHydrated(true);

    if (Platform.OS === 'web') {
      const mql =
        typeof window !== 'undefined' && typeof window.matchMedia === 'function'
          ? window.matchMedia('(prefers-color-scheme: dark)')
          : null;
      if (!mql) return;
      const handler = (event: MediaQueryListEvent) => {
        setSystemTheme(event.matches ? 'dark' : 'light');
      };
      setSystemTheme(mql.matches ? 'dark' : 'light');
      mql.addEventListener?.('change', handler);
      return () => {
        mql.removeEventListener?.('change', handler);
      };
    }

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
      if (next === preference) return;
      setPreferenceState(next);
      persistPreference(next);
      analytics.trackEvent('theme:changed', {
        theme: next,
        previous: preference,
        platform: Platform.OS,
      });
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

  if (!hydrated) return null;

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
