import { createInterFont } from '@tamagui/font-inter';
import { createFont, createTamagui, createTokens } from 'tamagui';
import { tamaguiColorTokens } from './src/ui/theme/palette';
import {
  radiusTokenValues,
  sizeTokenValues,
  spaceTokenValues,
  zIndexTokenValues,
} from './src/ui/theme/tokenValues';

const colorTokens = {
  ...tamaguiColorTokens,
  overlayScrim: 'rgba(0, 0, 0, 0.2)',
  shadowColorLight: 'rgba(15, 23, 42, 0.25)',
  shadowColorDark: 'rgba(0, 0, 0, 0.65)',
} as typeof tamaguiColorTokens & {
  overlayScrim: string;
  shadowColorLight: string;
  shadowColorDark: string;
};

const tokens = createTokens({
  color: colorTokens,
  space: spaceTokenValues,
  size: sizeTokenValues,
  radius: radiusTokenValues,
  zIndex: zIndexTokenValues,
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
    caption: 15,
    title: 28,
    hero: 40,
    sm: 16,
  },
  lineHeight: {
    1: 16,
    2: 20,
    3: 24,
    4: 28,
    5: 32,
    6: 40,
    7: 48,
    display: 60,
    sm: 24,
  },
  weight: {
    1: '300',
    2: '400',
    3: '500',
    4: '600',
    5: '700',
    sm: '500',
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

// These semantic recipes preserve the control geometry used before Tamagui v3.
const sizing = {
  default: 'md',
  sizes: {
    xs: {
      fontSize: '2',
      controlFontSize: '2',
      paddingInline: '2',
      paddingBlock: '0',
      gap: '0',
      radius: '2',
      px: { height: 6, icon: 14, square: 4 },
    },
    md: {
      fontSize: '4',
      controlFontSize: '4',
      paddingInline: '4',
      paddingBlock: '0',
      gap: '0',
      radius: '4',
      px: { height: 14, icon: 18, square: 8 },
    },
    lg: {
      fontSize: '5',
      controlFontSize: '5',
      paddingInline: '5',
      paddingBlock: '0',
      gap: '0',
      radius: '5',
      px: { height: 22, icon: 24, square: 12 },
    },
    xl: {
      fontSize: '5',
      controlFontSize: '5',
      paddingInline: '6',
      paddingBlock: '0',
      gap: '0',
      radius: '6',
      px: { height: 30, icon: 12, square: 16 },
    },
    xxl: {
      fontSize: '5',
      controlFontSize: '5',
      paddingInline: '7',
      paddingBlock: '0',
      gap: '0',
      radius: '7',
      px: { height: 38, icon: 12, square: 30 },
    },
  },
} as const;

const flatThemes = Object.fromEntries(
  Object.entries(themes).map(([name, theme]) => [
    name,
    {
      ...theme,
      'background-hover': theme.backgroundHover,
      'background-press': theme.backgroundPress,
      'background-focus': theme.backgroundFocus,
      'border-color': theme.borderColor,
      'border-color-hover': theme.borderColorHover,
      'border-color-press': theme.borderColorPress,
      'border-color-focus': theme.borderColorFocus,
      'accent-color': theme.accentColor,
      'outline-color': theme.outlineColor,
    },
  ]),
);

export const tamaguiConfig = createTamagui({
  tokens,
  themes: flatThemes,
  sizing,
  fonts: {
    body: bodyFont,
    heading: bodyFont,
  },
  settings: { defaultFont: 'body' },
  defaultTheme: 'light',
});

export type AppConfig = typeof tamaguiConfig;

declare module 'tamagui' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends AppConfig {}
}

export default tamaguiConfig;
