import type { ThemeColorSet, ThemeVariant } from './palette';

/**
 * Collection of predefined theme color sets
 * Change the active theme by updating the import in palette.ts
 */

// Current/Default theme (Tailwind-inspired blue)
export const defaultTheme: Record<ThemeVariant, ThemeColorSet> = {
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

// Nord - An arctic, north-bluish color palette
// https://www.nordtheme.com/docs/colors-and-palettes/
export const nordTheme: Record<ThemeVariant, ThemeColorSet> = {
  light: {
    background: '#ECEFF4', // Snow Storm (nord6)
    backgroundStrong: '#E5E9F0', // Snow Storm (nord5)
    backgroundHover: '#D8DEE9', // Snow Storm (nord4)
    backgroundPress: '#CBD2DC',
    color: '#2E3440', // Polar Night (nord0)
    colorPress: '#3B4252', // Polar Night (nord1)
    colorMuted: '#4C566A', // Polar Night (nord3)
    accent: '#5E81AC', // Frost (nord10)
    accentHover: '#81A1C1', // Frost (nord9)
    accentPress: '#88C0D0', // Frost (nord8)
    accentMuted: '#8FBCBB', // Frost (nord7)
    borderColor: '#D8DEE9',
    borderColorPress: '#C2C9D6',
    outlineColor: '#5E81AC',
    surface: '#E5E9F0',
    secondaryBackground: '#D8DEE9',
    secondaryText: '#4C566A',
    danger: '#BF616A', // Aurora (nord11)
    dangerHover: '#D08770', // Aurora (nord12)
    dangerBackground: '#F4E5E6',
  },
  dark: {
    background: '#2E3440', // Polar Night (nord0)
    backgroundStrong: '#3B4252', // Polar Night (nord1)
    backgroundHover: '#434C5E', // Polar Night (nord2)
    backgroundPress: '#4C566A', // Polar Night (nord3)
    color: '#ECEFF4', // Snow Storm (nord6)
    colorPress: '#E5E9F0', // Snow Storm (nord5)
    colorMuted: '#D8DEE9', // Snow Storm (nord4)
    accent: '#88C0D0', // Frost (nord8)
    accentHover: '#81A1C1', // Frost (nord9)
    accentPress: '#5E81AC', // Frost (nord10)
    accentMuted: '#8FBCBB', // Frost (nord7)
    borderColor: '#4C566A',
    borderColorPress: '#5E6A7D',
    outlineColor: '#88C0D0',
    surface: '#3B4252',
    secondaryBackground: '#434C5E',
    secondaryText: '#D8DEE9',
    danger: '#BF616A', // Aurora (nord11)
    dangerHover: '#D08770', // Aurora (nord12)
    dangerBackground: '#4A3535',
  },
};

// Dracula - A dark theme with vibrant colors (WCAG 2.1 Level AA compliant)
// https://draculatheme.com/spec
export const draculaTheme: Record<ThemeVariant, ThemeColorSet> = {
  light: {
    background: '#F8F8F2', // Foreground
    backgroundStrong: '#E6E6DC',
    backgroundHover: '#F0F0EA',
    backgroundPress: '#D9D9CF',
    color: '#282A36', // Background
    colorPress: '#44475A', // Current Line
    colorMuted: '#6272A4', // Comment
    accent: '#8BE9FD', // Cyan
    accentHover: '#6DD9F3',
    accentPress: '#50C9E9',
    accentMuted: '#6272A4',
    borderColor: '#D9D9CF',
    borderColorPress: '#C2C2B8',
    outlineColor: '#8BE9FD',
    surface: '#E6E6DC',
    secondaryBackground: '#D9D9CF',
    secondaryText: '#6272A4',
    danger: '#FF5555', // Red
    dangerHover: '#FF6E6E',
    dangerBackground: '#FFE5E5',
  },
  dark: {
    background: '#282A36', // Background
    backgroundStrong: '#21222C',
    backgroundHover: '#343746',
    backgroundPress: '#44475A', // Current Line
    color: '#F8F8F2', // Foreground
    colorPress: '#E0E0D8',
    colorMuted: '#6272A4', // Comment
    accent: '#8BE9FD', // Cyan
    accentHover: '#A3EFFF',
    accentPress: '#6DD9F3',
    accentMuted: '#6272A4',
    borderColor: '#44475A',
    borderColorPress: '#565966',
    outlineColor: '#8BE9FD',
    surface: '#343746',
    secondaryBackground: '#44475A',
    secondaryText: '#F8F8F2',
    danger: '#FF5555', // Red
    dangerHover: '#FF6E6E',
    dangerBackground: '#4A2828',
  },
};

// Catppuccin Mocha - Modern pastel theme
// https://github.com/catppuccin/catppuccin
export const catppuccinTheme: Record<ThemeVariant, ThemeColorSet> = {
  light: {
    background: '#EFF1F5', // Base
    backgroundStrong: '#E6E9EF', // Mantle
    backgroundHover: '#DCE0E8', // Crust
    backgroundPress: '#CCD0DA',
    color: '#4C4F69', // Text
    colorPress: '#5C5F77', // Subtext1
    colorMuted: '#6C6F85', // Subtext0
    accent: '#1E66F5', // Blue
    accentHover: '#2374FC',
    accentPress: '#1E5FDB',
    accentMuted: '#7287FD',
    borderColor: '#DCE0E8',
    borderColorPress: '#CCD0DA',
    outlineColor: '#1E66F5',
    surface: '#E6E9EF',
    secondaryBackground: '#DCE0E8',
    secondaryText: '#6C6F85',
    danger: '#D20F39', // Red
    dangerHover: '#E64553',
    dangerBackground: '#FFE5E9',
  },
  dark: {
    background: '#1E1E2E', // Base
    backgroundStrong: '#181825', // Mantle
    backgroundHover: '#11111B', // Crust
    backgroundPress: '#313244', // Surface0
    color: '#CDD6F4', // Text
    colorPress: '#BAC2DE', // Subtext1
    colorMuted: '#A6ADC8', // Subtext0
    accent: '#89B4FA', // Blue
    accentHover: '#A0C8FF',
    accentPress: '#739FE5',
    accentMuted: '#585B70',
    borderColor: '#313244',
    borderColorPress: '#45475A',
    outlineColor: '#89B4FA',
    surface: '#181825',
    secondaryBackground: '#313244',
    secondaryText: '#A6ADC8',
    danger: '#F38BA8', // Red
    dangerHover: '#F5A8BD',
    dangerBackground: '#3F2838',
  },
};

// Minimal Tamagui - Clean grayscale with blue accent
// https://tamagui.dev/docs/intro/themes
export const minimalTheme: Record<ThemeVariant, ThemeColorSet> = {
  light: {
    background: '#FFFFFF',
    backgroundStrong: '#F5F5F5',
    backgroundHover: '#FAFAFA',
    backgroundPress: '#E5E5E5',
    color: '#000000',
    colorPress: '#404040',
    colorMuted: '#737373',
    accent: '#3B82F6',
    accentHover: '#2563EB',
    accentPress: '#1D4ED8',
    accentMuted: '#93C5FD',
    borderColor: '#E5E5E5',
    borderColorPress: '#D4D4D4',
    outlineColor: '#3B82F6',
    surface: '#FAFAFA',
    secondaryBackground: '#F5F5F5',
    secondaryText: '#737373',
    danger: '#EF4444',
    dangerHover: '#DC2626',
    dangerBackground: '#FEE2E2',
  },
  dark: {
    background: '#000000',
    backgroundStrong: '#0A0A0A',
    backgroundHover: '#171717',
    backgroundPress: '#262626',
    color: '#FAFAFA',
    colorPress: '#E5E5E5',
    colorMuted: '#A3A3A3',
    accent: '#60A5FA',
    accentHover: '#3B82F6',
    accentPress: '#2563EB',
    accentMuted: '#1E3A8A',
    borderColor: '#262626',
    borderColorPress: '#404040',
    outlineColor: '#60A5FA',
    surface: '#171717',
    secondaryBackground: '#262626',
    secondaryText: '#A3A3A3',
    danger: '#F87171',
    dangerHover: '#EF4444',
    dangerBackground: '#7F1D1D',
  },
};

// Tokyo Night - Celebrates the neon lights of Tokyo at night
// https://github.com/tokyo-night/tokyo-night-vscode-theme
export const tokyoNightTheme: Record<ThemeVariant, ThemeColorSet> = {
  light: {
    background: '#D5D6DB',
    backgroundStrong: '#CBCCD1',
    backgroundHover: '#DFE0E5',
    backgroundPress: '#C4C6CD',
    color: '#343B58',
    colorPress: '#4C5279',
    colorMuted: '#565A6E',
    accent: '#2E7DE9', // Blue
    accentHover: '#188092', // Cyan
    accentPress: '#2959AA',
    accentMuted: '#7890DD',
    borderColor: '#C4C6CD',
    borderColorPress: '#B4B6BD',
    outlineColor: '#2E7DE9',
    surface: '#E1E2E7',
    secondaryBackground: '#C4C6CD',
    secondaryText: '#565A6E',
    danger: '#F52A65', // Red/Magenta
    dangerHover: '#B15C00', // Orange
    dangerBackground: '#FFE5EE',
  },
  dark: {
    background: '#1A1B26', // Night background
    backgroundStrong: '#16161E',
    backgroundHover: '#24283B', // Storm background
    backgroundPress: '#414868',
    color: '#C0CAF5', // Foreground
    colorPress: '#A9B1D6',
    colorMuted: '#565F89', // Comment
    accent: '#7AA2F7', // Blue
    accentHover: '#7DCFFF', // Cyan
    accentPress: '#3D59A1',
    accentMuted: '#565F89',
    borderColor: '#292E42',
    borderColorPress: '#3B4261',
    outlineColor: '#7AA2F7',
    surface: '#1F2335',
    secondaryBackground: '#24283B',
    secondaryText: '#9AA5CE',
    danger: '#F7768E', // Red/magenta
    dangerHover: '#FF9E64', // Orange
    dangerBackground: '#3F2D3D',
  },
};

// Gruvbox - Retro groove color scheme with warm, earthy tones
// https://github.com/morhetz/gruvbox
export const gruvboxTheme: Record<ThemeVariant, ThemeColorSet> = {
  light: {
    background: '#FBF1C7', // bg0
    backgroundStrong: '#F2E5BC', // bg1
    backgroundHover: '#EBDBB2', // bg2
    backgroundPress: '#D5C4A1', // bg3
    color: '#3C3836', // fg0
    colorPress: '#504945', // fg1
    colorMuted: '#665C54', // fg2
    accent: '#458588', // Blue
    accentHover: '#076678', // Blue hard
    accentPress: '#83A598', // Blue bright
    accentMuted: '#7C6F64', // gray
    borderColor: '#D5C4A1',
    borderColorPress: '#BDAE93',
    outlineColor: '#458588',
    surface: '#F2E5BC',
    secondaryBackground: '#EBDBB2',
    secondaryText: '#665C54',
    danger: '#CC241D', // Red
    dangerHover: '#9D0006', // Red hard
    dangerBackground: '#FBE5E1',
  },
  dark: {
    background: '#282828', // bg0
    backgroundStrong: '#1D2021', // bg0_h
    backgroundHover: '#3C3836', // bg1
    backgroundPress: '#504945', // bg2
    color: '#EBDBB2', // fg0
    colorPress: '#D5C4A1', // fg1
    colorMuted: '#BDAE93', // fg2
    accent: '#83A598', // Blue bright
    accentHover: '#458588', // Blue
    accentPress: '#076678', // Blue hard
    accentMuted: '#928374', // gray
    borderColor: '#504945',
    borderColorPress: '#665C54',
    outlineColor: '#83A598',
    surface: '#32302F', // bg0_s
    secondaryBackground: '#3C3836',
    secondaryText: '#A89984', // fg4
    danger: '#FB4934', // Red bright
    dangerHover: '#CC241D', // Red
    dangerBackground: '#442E2E',
  },
};

// Solarized - Precision colors for machines and people
// https://ethanschoonover.com/solarized/
export const solarizedTheme: Record<ThemeVariant, ThemeColorSet> = {
  light: {
    background: '#FDF6E3', // base3
    backgroundStrong: '#EEE8D5', // base2
    backgroundHover: '#E8E2D0',
    backgroundPress: '#DDD7C5',
    color: '#657B83', // base00
    colorPress: '#586E75', // base01
    colorMuted: '#93A1A1', // base1
    accent: '#268BD2', // Blue
    accentHover: '#2AA198', // Cyan
    accentPress: '#6C71C4', // Violet
    accentMuted: '#93A1A1',
    borderColor: '#DDD7C5',
    borderColorPress: '#CCC6B5',
    outlineColor: '#268BD2',
    surface: '#EEE8D5',
    secondaryBackground: '#E8E2D0',
    secondaryText: '#586E75',
    danger: '#DC322F', // Red
    dangerHover: '#CB4B16', // Orange
    dangerBackground: '#FEEEED',
  },
  dark: {
    background: '#002B36', // base03
    backgroundStrong: '#073642', // base02
    backgroundHover: '#0D4251',
    backgroundPress: '#134E5E',
    color: '#839496', // base0
    colorPress: '#93A1A1', // base1
    colorMuted: '#586E75', // base01
    accent: '#268BD2', // Blue
    accentHover: '#2AA198', // Cyan
    accentPress: '#6C71C4', // Violet
    accentMuted: '#586E75',
    borderColor: '#0D4251',
    borderColorPress: '#134E5E',
    outlineColor: '#268BD2',
    surface: '#073642',
    secondaryBackground: '#0D4251',
    secondaryText: '#93A1A1',
    danger: '#DC322F', // Red
    dangerHover: '#CB4B16', // Orange
    dangerBackground: '#3F1E1D',
  },
};

// One Dark - Atom's iconic dark theme
// https://github.com/atom/one-dark-syntax
export const oneDarkTheme: Record<ThemeVariant, ThemeColorSet> = {
  light: {
    background: '#FAFAFA',
    backgroundStrong: '#F0F0F0',
    backgroundHover: '#F5F5F5',
    backgroundPress: '#E5E5E5',
    color: '#383A42',
    colorPress: '#4F525E',
    colorMuted: '#A0A1A7',
    accent: '#4078F2', // Blue
    accentHover: '#0184BC', // Cyan
    accentPress: '#3D59A1',
    accentMuted: '#A0A1A7',
    borderColor: '#E5E5E5',
    borderColorPress: '#D0D0D0',
    outlineColor: '#4078F2',
    surface: '#F0F0F0',
    secondaryBackground: '#E5E5E5',
    secondaryText: '#696C77',
    danger: '#E45649', // Red
    dangerHover: '#CA1243',
    dangerBackground: '#FFE5E5',
  },
  dark: {
    background: '#282C34',
    backgroundStrong: '#21252B',
    backgroundHover: '#2C313C',
    backgroundPress: '#3E4451',
    color: '#ABB2BF',
    colorPress: '#B6BDCA',
    colorMuted: '#5C6370', // Comment
    accent: '#61AFEF', // Blue
    accentHover: '#56B6C2', // Cyan
    accentPress: '#528BFF', // Accent blue
    accentMuted: '#5C6370',
    borderColor: '#3E4451',
    borderColorPress: '#4B5263',
    outlineColor: '#61AFEF',
    surface: '#2C313C',
    secondaryBackground: '#3E4451',
    secondaryText: '#828997',
    danger: '#E06C75', // Red
    dangerHover: '#BE5046',
    dangerBackground: '#3F2D30',
  },
};

// Rosé Pine - All natural pine, faux fur and a bit of soho vibes
// https://rosepinetheme.com
export const rosePineTheme: Record<ThemeVariant, ThemeColorSet> = {
  light: {
    background: '#FAF4ED', // base (dawn)
    backgroundStrong: '#FFFAF3', // surface
    backgroundHover: '#F2E9E1', // overlay
    backgroundPress: '#DFDAD9', // highlight med
    color: '#575279', // text
    colorPress: '#797593', // subtle
    colorMuted: '#9893A5', // muted
    accent: '#286983', // pine
    accentHover: '#56949F', // foam
    accentPress: '#907AA9', // iris
    accentMuted: '#9893A5',
    borderColor: '#DFDAD9',
    borderColorPress: '#CECACD',
    outlineColor: '#286983',
    surface: '#FFFAF3',
    secondaryBackground: '#F2E9E1',
    secondaryText: '#797593',
    danger: '#B4637A', // love
    dangerHover: '#D7827E', // rose
    dangerBackground: '#F4EDE8',
  },
  dark: {
    background: '#191724', // base (main)
    backgroundStrong: '#1F1D2E', // surface
    backgroundHover: '#26233A', // overlay
    backgroundPress: '#403D52', // highlight med
    color: '#E0DEF4', // text
    colorPress: '#908CAA', // subtle
    colorMuted: '#6E6A86', // muted
    accent: '#31748F', // pine
    accentHover: '#9CCFD8', // foam
    accentPress: '#C4A7E7', // iris
    accentMuted: '#6E6A86',
    borderColor: '#403D52',
    borderColorPress: '#524F67',
    outlineColor: '#31748F',
    surface: '#1F1D2E',
    secondaryBackground: '#26233A',
    secondaryText: '#908CAA',
    danger: '#EB6F92', // love
    dangerHover: '#EBBCBA', // rose
    dangerBackground: '#3F2838',
  },
};

// Apple - iOS Human Interface Guidelines system colors
// https://developer.apple.com/design/human-interface-guidelines/color
export const appleTheme: Record<ThemeVariant, ThemeColorSet> = {
  light: {
    background: '#FFFFFF', // systemBackground
    backgroundStrong: '#F2F2F7', // secondarySystemBackground
    backgroundHover: '#F2F2F7', // secondarySystemBackground
    backgroundPress: '#E5E5EA', // Slightly darker
    color: '#000000', // label
    colorPress: '#000000', // label
    colorMuted: '#3C3C4399', // secondaryLabel (with alpha)
    accent: '#007AFF', // systemBlue
    accentHover: '#0051D5', // systemBlue darker
    accentPress: '#003D99', // systemBlue even darker
    accentMuted: '#007AFF4D', // systemBlue with alpha
    borderColor: '#3C3C434A', // separator (with alpha)
    borderColorPress: '#C6C6C8', // opaqueSeparator
    outlineColor: '#007AFF',
    surface: '#F2F2F7', // secondarySystemBackground
    secondaryBackground: '#FFFFFF', // tertiarySystemBackground
    secondaryText: '#3C3C4399', // secondaryLabel
    danger: '#FF3B30', // systemRed
    dangerHover: '#D70015', // systemRed darker
    dangerBackground: '#FF3B3033', // systemRed with alpha
  },
  dark: {
    background: '#000000', // systemBackground
    backgroundStrong: '#1C1C1E', // secondarySystemBackground
    backgroundHover: '#1C1C1E', // secondarySystemBackground
    backgroundPress: '#2C2C2E', // tertiarySystemBackground
    color: '#FFFFFF', // label
    colorPress: '#FFFFFF', // label
    colorMuted: '#EBEBF599', // secondaryLabel (with alpha)
    accent: '#0A84FF', // systemBlue dark mode
    accentHover: '#409CFF', // systemBlue lighter
    accentPress: '#64ACFF', // systemBlue even lighter
    accentMuted: '#0A84FF4D', // systemBlue with alpha
    borderColor: '#545458', // separator
    borderColorPress: '#38383A', // opaqueSeparator
    outlineColor: '#0A84FF',
    surface: '#1C1C1E', // secondarySystemBackground
    secondaryBackground: '#2C2C2E', // tertiarySystemBackground
    secondaryText: '#EBEBF599', // secondaryLabel
    danger: '#FF453A', // systemRed dark mode
    dangerHover: '#FF6961', // systemRed lighter
    dangerBackground: '#FF453A33', // systemRed with alpha
  },
};

// Coinbase - Clean, professional design from Coinbase Design System
// https://github.com/coinbase/cds/tree/master/packages/mobile/src/themes
export const coinbaseTheme: Record<ThemeVariant, ThemeColorSet> = {
  light: {
    background: '#FFFFFF', // rgb(255,255,255) - gray0
    backgroundStrong: '#F7F8F9', // rgb(247,248,249) - gray5
    backgroundHover: '#EEF0F3', // rgb(238,240,243) - gray10
    backgroundPress: '#DEE1E7', // rgb(222,225,231) - gray15
    color: '#0A0B0D', // rgb(10,11,13) - gray100 (primary text)
    colorPress: '#0A0B0D', // Same as primary text
    colorMuted: '#5B616E', // rgb(91,97,110) - gray60 (muted text)
    accent: '#3773F5', // rgb(55,115,245) - blue60 (official UI primary)
    accentHover: '#2E5FD9', // Slightly darker blue
    accentPress: '#2550C1', // Even darker on press
    accentMuted: '#CED2DB', // rgb(206,210,219) - gray20 (subtle accent)
    borderColor: '#5B616E33', // gray60 at 20% opacity (rgba(91,97,110,0.2))
    borderColorPress: '#5B616EA8', // gray60 at 66% opacity
    outlineColor: '#3773F5',
    surface: '#F7F8F9', // gray5
    secondaryBackground: '#EEF0F3', // gray10
    secondaryText: '#5B616E', // gray60
    danger: '#CF202F', // rgb(207,32,47) - red60
    dangerHover: '#B71C29',
    dangerBackground: '#FFEBEE',
  },
  dark: {
    background: '#0A0B0D', // rgb(10,11,13) - gray0 (dark base)
    backgroundStrong: '#141519', // rgb(20,21,25) - gray5
    backgroundHover: '#1E2025', // rgb(30,32,37) - gray10
    backgroundPress: '#282B31', // rgb(40,43,49) - gray15
    color: '#FFFFFF', // rgb(255,255,255) - white (primary text)
    colorPress: '#FFFFFF', // Same as primary text
    colorMuted: '#8A919E', // rgb(138,145,158) - gray60 (muted text)
    accent: '#578BFA', // rgb(87,139,250) - blue70 (official UI primary dark)
    accentHover: '#6B98FB', // Lighter on hover (dark mode pattern)
    accentPress: '#7FA5FC', // Even lighter on press
    accentMuted: '#32353D', // rgb(50,53,61) - gray20 (subtle accent)
    borderColor: '#8A919E33', // gray60 at 20% opacity (rgba(138,145,158,0.2))
    borderColorPress: '#8A919EA8', // gray60 at 66% opacity
    outlineColor: '#578BFA',
    surface: '#141519', // gray5
    secondaryBackground: '#1E2025', // gray10
    secondaryText: '#8A919E', // gray60
    danger: '#F0616D', // rgb(240,97,109) - red60 dark
    dangerHover: '#F37681',
    dangerBackground: '#3D1E20',
  },
};

/**
 * Available theme presets
 * Add new themes to this object to make them available
 */
export const themes = {
  default: defaultTheme,
  nord: nordTheme,
  dracula: draculaTheme,
  catppuccin: catppuccinTheme,
  minimal: minimalTheme,
  tokyoNight: tokyoNightTheme,
  gruvbox: gruvboxTheme,
  solarized: solarizedTheme,
  oneDark: oneDarkTheme,
  rosePine: rosePineTheme,
  apple: appleTheme,
  coinbase: coinbaseTheme,
} as const;

export type ThemeName = keyof typeof themes;
