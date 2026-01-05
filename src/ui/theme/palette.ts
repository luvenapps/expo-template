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

export const themeColorSets: Record<ThemeVariant, ThemeColorSet> = {
  light: {
    background: '#FFFFFF',
    backgroundStrong: '#F1F5F9',
    backgroundHover: '#F8FAFC',
    backgroundPress: '#E2E8F0',
    color: '#0F172A',
    colorPress: '#475569',
    colorMuted: '#475569',
    accent: '#2563EB',
    accentHover: '#1D4ED8',
    accentPress: '#1E40AF',
    accentMuted: '#94A3B8',
    borderColor: '#CBD5F5',
    borderColorPress: '#94A3B8',
    outlineColor: '#2563EB',
    surface: '#F8FAFC',
    secondaryBackground: '#F1F5F9',
    secondaryText: '#475569',
    danger: '#DC2626',
    dangerHover: '#B91C1C',
    dangerBackground: '#FEE2E2',
  },
  dark: {
    background: '#0F172A',
    backgroundStrong: '#111827',
    backgroundHover: '#1C2534',
    backgroundPress: '#1F2937',
    color: '#E2E8F0',
    colorPress: '#94A3B8',
    colorMuted: '#94A3B8',
    accent: '#60A5FA',
    accentHover: '#3B82F6',
    accentPress: '#2563EB',
    accentMuted: '#94A3B8',
    borderColor: '#334155',
    borderColorPress: '#1E293B',
    outlineColor: '#60A5FA',
    surface: '#111827',
    secondaryBackground: '#1F2937',
    secondaryText: '#94A3B8',
    danger: '#FCA5A5',
    dangerHover: '#FB7185',
    dangerBackground: '#7F1D1D',
  },
};

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
