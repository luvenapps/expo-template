import { themes } from './themes';

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
 * Active theme color sets
 * Change this to use a different theme from themes.ts
 * Available: 'default', 'nord', 'catppuccin',
 *            'tokyoNight', 'gruvbox', 'rosePine', 'apple', 'coinbase'
 */
export const themeColorSets: Record<ThemeVariant, ThemeColorSet> = themes.coinbase;

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

export const tamaguiColorTokens = Object.entries(themeColorSets).reduce(
  (acc, [variant, colors]) => {
    const suffix = variant === 'light' ? 'Light' : 'Dark';
    Object.entries(colors).forEach(([key, value]) => {
      acc[`${key}${suffix}`] = value;
    });
    return acc;
  },
  {} as Record<string, string>,
);
