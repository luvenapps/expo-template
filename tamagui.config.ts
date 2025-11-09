/* istanbul ignore file */
import { createInterFont } from '@tamagui/font-inter';
import { createFont, createTamagui, createTokens } from 'tamagui';

const tokens = createTokens({
  color: {
    background: '#FFFFFF',
    backgroundStrong: '#F1F5F9',
    backgroundHover: '#F8FAFC',
    backgroundPress: '#E2E8F0',
    color: '#0F172A',
    colorMuted: '#475569',
    accent: '#2563EB',
    accentHover: '#1D4ED8',
    borderColor: '#CBD5F5',
    borderColorPress: '#94A3B8',
    outlineColor: '#000000',
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
    background: tokens.color.background,
    backgroundStrong: tokens.color.backgroundStrong,
    backgroundHover: tokens.color.backgroundHover,
    backgroundPress: tokens.color.backgroundPress,
    color: tokens.color.color,
    colorMuted: tokens.color.colorMuted,
    accentColor: tokens.color.accent,
    accentColorHover: tokens.color.accentHover,
    borderColor: tokens.color.borderColor,
    borderColorHover: tokens.color.borderColorPress,
  },
  dark: {
    background: '#1a1a1a',
    backgroundStrong: '#111827',
    backgroundHover: '#1C2534',
    backgroundPress: '#1F2937',
    color: '#FFFFFF',
    colorMuted: '#E2E8F0',
    accentColor: '#60A5FA',
    accentColorHover: '#3B82F6',
    borderColor: '#334155',
    borderColorHover: '#1E293B',
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
