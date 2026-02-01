/* istanbul ignore file */
import { createInterFont } from '@tamagui/font-inter';
import { createFont, createTamagui, createTokens } from 'tamagui';
import { tamaguiColorTokens } from './src/ui/theme/palette';

const colorTokens = {
  ...tamaguiColorTokens,
  shadowColorLight: 'rgba(15, 23, 42, 0.25)',
  shadowColorDark: 'rgba(0, 0, 0, 0.65)',
} as typeof tamaguiColorTokens & {
  shadowColorLight: string;
  shadowColorDark: string;
};

const tokens = createTokens({
  color: colorTokens,
  space: {
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
    6: 40,
    7: 48,
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
    colorPress: tokens.color.colorPressLight,
    colorMuted: tokens.color.colorMutedLight,
    accentColor: tokens.color.accentLight,
    accentColorHover: tokens.color.accentHoverLight,
    accentColorPress: tokens.color.accentPressLight,
    accentColorMuted: tokens.color.accentMutedLight,
    borderColor: tokens.color.borderColorLight,
    borderColorHover: tokens.color.borderColorPressLight,
    borderColorPress: tokens.color.borderColorPressLight,
    borderColorFocus: tokens.color.accentLight,
    outlineColor: tokens.color.outlineColorLight,
    surface: tokens.color.surfaceLight,
    secondaryBackground: tokens.color.secondaryBackgroundLight,
    secondaryText: tokens.color.secondaryTextLight,
    dangerColor: tokens.color.dangerLight,
    dangerColorHover: tokens.color.dangerHoverLight,
    dangerBackground: tokens.color.dangerBackgroundLight,
    shadowColor: tokens.color.shadowColorLight,
  },
  dark: {
    background: tokens.color.backgroundDark,
    backgroundStrong: tokens.color.backgroundStrongDark,
    backgroundHover: tokens.color.backgroundHoverDark,
    backgroundPress: tokens.color.backgroundPressDark,
    backgroundFocus: tokens.color.backgroundHoverDark,
    color: tokens.color.colorDark,
    colorPress: tokens.color.colorPressDark,
    colorMuted: tokens.color.colorMutedDark,
    accentColor: tokens.color.accentDark,
    accentColorHover: tokens.color.accentHoverDark,
    accentColorPress: tokens.color.accentPressDark,
    accentColorMuted: tokens.color.accentMutedDark,
    borderColor: tokens.color.borderColorDark,
    borderColorHover: tokens.color.borderColorPressDark,
    borderColorPress: tokens.color.borderColorPressDark,
    borderColorFocus: tokens.color.accentDark,
    outlineColor: tokens.color.outlineColorDark,
    surface: tokens.color.surfaceDark,
    secondaryBackground: tokens.color.secondaryBackgroundDark,
    secondaryText: tokens.color.secondaryTextDark,
    dangerColor: tokens.color.dangerDark,
    dangerColorHover: tokens.color.dangerHoverDark,
    dangerBackground: tokens.color.dangerBackgroundDark,
    shadowColor: tokens.color.shadowColorDark,
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
