import { themes, type PaletteName } from './themes';

export type ThemeVariant = 'light' | 'dark';

export type ThemeColorSet = {
  background: string;
  backgroundStrong: string;
  backgroundHover: string;
  backgroundPress: string;
  color: string;
  colorPress: string;
  colorMuted: string;
  accent: string;
  accentHover: string;
  accentPress: string;
  accentMuted: string;
  borderColor: string;
  borderColorPress: string;
  outlineColor: string;
  surface: string;
  secondaryBackground: string;
  secondaryText: string;
  danger: string;
  dangerHover: string;
  dangerBackground: string;
};

/**
 * The app palette is selected here. Users can still choose system, light, or dark mode.
 */
export const activePaletteName = 'coinbase' satisfies PaletteName;
export const themeColorSets = themes[activePaletteName] satisfies Record<
  ThemeVariant,
  ThemeColorSet
>;

export type ThemePalette = {
  background: string;
  text: string;
  mutedText: string;
  accent: string;
  accentMuted: string;
  surface: string;
  secondaryBackground: string;
  secondaryText: string;
  dangerColor: string;
  dangerBackground: string;
};

export const themePalettes: Record<ThemeVariant, ThemePalette> = {
  light: {
    background: themeColorSets.light.background,
    text: themeColorSets.light.color,
    mutedText: themeColorSets.light.colorMuted,
    accent: themeColorSets.light.accent,
    accentMuted: themeColorSets.light.accentMuted,
    surface: themeColorSets.light.surface,
    secondaryBackground: themeColorSets.light.secondaryBackground,
    secondaryText: themeColorSets.light.secondaryText,
    dangerColor: themeColorSets.light.danger,
    dangerBackground: themeColorSets.light.dangerBackground,
  },
  dark: {
    background: themeColorSets.dark.background,
    text: themeColorSets.dark.color,
    mutedText: themeColorSets.dark.colorMuted,
    accent: themeColorSets.dark.accent,
    accentMuted: themeColorSets.dark.accentMuted,
    surface: themeColorSets.dark.surface,
    secondaryBackground: themeColorSets.dark.secondaryBackground,
    secondaryText: themeColorSets.dark.secondaryText,
    dangerColor: themeColorSets.dark.danger,
    dangerBackground: themeColorSets.dark.dangerBackground,
  },
};

export const settingsIconColorTokens = {
  settingsTheme: '#5E5CE6',
  settingsLanguage: '#FF9500',
  settingsNotifications: '#FF3B30',
  settingsAccount: '#007AFF',
  settingsDeveloper: '#8E8E93',
  settingsHelp: '#34C759',
  settingsTerms: '#AF52DE',
  settingsPrivacy: '#30B0C7',
} as const;

const themeColorTokens = Object.entries(themeColorSets).reduce(
  (acc, [variant, colors]) => {
    const suffix = variant === 'light' ? 'Light' : 'Dark';
    Object.entries(colors).forEach(([key, value]) => {
      acc[`${key}${suffix}`] = value;
    });
    return acc;
  },
  {} as Record<string, string>,
);

export const tamaguiColorTokens: Record<string, string> & typeof settingsIconColorTokens = {
  ...themeColorTokens,
  ...settingsIconColorTokens,
};
