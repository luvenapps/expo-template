/* istanbul ignore file */
import { createInterFont } from '@tamagui/font-inter';
import { createFont, createTamagui, createTokens } from 'tamagui';

const tokens = createTokens({
  color: {
    // Light theme tokens
    backgroundLight: '#FFFFFF',
    backgroundStrongLight: '#F1F5F9',
    backgroundHoverLight: '#F8FAFC',
    backgroundPressLight: '#E2E8F0',
    colorLight: '#0F172A',
    colorMutedLight: '#475569',
    accentLight: '#2563EB',
    accentHoverLight: '#1D4ED8',
    accentMutedLight: '#94A3B8',
    borderColorLight: '#CBD5F5',
    borderColorPressLight: '#94A3B8',
    outlineColorLight: '#2563EB',
    surfaceLight: '#F8FAFC',
    secondaryBackgroundLight: '#F1F5F9',
    secondaryTextLight: '#475569',
    // Dark theme tokens
    backgroundDark: '#0F172A',
    backgroundStrongDark: '#111827',
    backgroundHoverDark: '#1C2534',
    backgroundPressDark: '#1F2937',
    colorDark: '#E2E8F0',
    colorMutedDark: '#94A3B8',
    accentDark: '#60A5FA',
    accentHoverDark: '#3B82F6',
    accentMutedDark: '#94A3B8',
    borderColorDark: '#334155',
    borderColorPressDark: '#1E293B',
    outlineColorDark: '#60A5FA',
    surfaceDark: '#111827',
    secondaryBackgroundDark: '#1F2937',
    secondaryTextDark: '#94A3B8',
  },
  space: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 24,
    6: 32,
    true: 16,
  },
  size: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 24,
    6: 32,
    7: 40,
    8: 48,
    true: 16,
  },
  radius: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 24,
    6: 32,
    7: 40,
    8: 48,
    true: 12,
  },
  zIndex: {
    0: 0,
    1: 1,
    2: 10,
    3: 20,
    4: 30,
    true: 1,
  },
});

const interFont = createInterFont();

const bodyFont = createFont({
  family: interFont.family,
  size: {
    1: 12,
    2: 14,
    3: 16,
    4: 18,
    5: 24,
    true: 16,
  },
  lineHeight: {
    1: 16,
    2: 20,
    3: 24,
    4: 28,
    5: 32,
    true: 24,
  },
  weight: {
    1: '300',
    2: '400',
    3: '500',
    4: '600',
    5: '700',
  },
});

const themes = {
  light: {
    background: tokens.color.backgroundLight,
    backgroundStrong: tokens.color.backgroundStrongLight,
    backgroundHover: tokens.color.backgroundHoverLight,
    backgroundPress: tokens.color.backgroundPressLight,
    backgroundFocus: tokens.color.backgroundHoverLight,
    color: tokens.color.colorLight,
    colorMuted: tokens.color.colorMutedLight,
    accentColor: tokens.color.accentLight,
    accentColorHover: tokens.color.accentHoverLight,
    accentColorPress: '#1E40AF',
    accentColorMuted: tokens.color.accentMutedLight,
    borderColor: tokens.color.borderColorLight,
    borderColorHover: tokens.color.borderColorPressLight,
    borderColorPress: tokens.color.borderColorPressLight,
    borderColorFocus: tokens.color.accentLight,
    outlineColor: tokens.color.outlineColorLight,
    surface: tokens.color.surfaceLight,
    secondaryBackground: tokens.color.secondaryBackgroundLight,
    secondaryText: tokens.color.secondaryTextLight,
  },
  dark: {
    background: tokens.color.backgroundDark,
    backgroundStrong: tokens.color.backgroundStrongDark,
    backgroundHover: tokens.color.backgroundHoverDark,
    backgroundPress: tokens.color.backgroundPressDark,
    backgroundFocus: tokens.color.backgroundHoverDark,
    color: tokens.color.colorDark,
    colorMuted: tokens.color.colorMutedDark,
    accentColor: tokens.color.accentDark,
    accentColorHover: tokens.color.accentHoverDark,
    accentColorPress: '#2563EB',
    accentColorMuted: tokens.color.accentMutedDark,
    borderColor: tokens.color.borderColorDark,
    borderColorHover: tokens.color.borderColorPressDark,
    borderColorPress: tokens.color.borderColorPressDark,
    borderColorFocus: tokens.color.accentDark,
    outlineColor: tokens.color.outlineColorDark,
    surface: tokens.color.surfaceDark,
    secondaryBackground: tokens.color.secondaryBackgroundDark,
    secondaryText: tokens.color.secondaryTextDark,
  },
};

export const tamaguiConfig = createTamagui({
  tokens,
  themes,
  fonts: {
    body: bodyFont,
  },
  defaultTheme: 'light',
});

export type AppConfig = typeof tamaguiConfig;

declare module 'tamagui' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends AppConfig {}
}

export default tamaguiConfig;
