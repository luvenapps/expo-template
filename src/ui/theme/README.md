# Theme System

This directory contains the theme configuration for the application.

## Quick Start

To change the active theme, edit [palette.ts](./palette.ts) line 33:

```typescript
// Change 'default' to any available theme
export const themeColorSets: Record<ThemeVariant, ThemeColorSet> = themes.default;
```

## Available Themes

All themes are defined in [themes.ts](./themes.ts):

### 1. **default** (Current)

Tailwind-inspired blue theme with clean grays

- Light: White backgrounds with blue (#2563EB) accents
- Dark: Slate backgrounds with light blue (#60A5FA) accents

### 2. **nord**

Arctic, north-bluish color palette ([nordtheme.com](https://www.nordtheme.com))

- Light: Soft snow-white backgrounds with frost blue accents
- Dark: Polar night backgrounds with arctic frost accents
- Perfect for: Clean, professional interfaces

### 3. **dracula**

Dark theme with vibrant colors ([draculatheme.com](https://draculatheme.com))

- Light: Inverted with cream backgrounds
- Dark: Deep purple-gray with cyan (#8BE9FD) accents
- Perfect for: Developer tools, code-heavy UIs
- WCAG 2.1 Level AA compliant

### 4. **catppuccin**

Modern pastel theme ([github.com/catppuccin](https://github.com/catppuccin/catppuccin))

- Light: Latte - Soft beige with vibrant blue accents
- Dark: Mocha - Deep charcoal with pastel blue accents
- Perfect for: Modern, playful interfaces

### 5. **minimal**

Pure grayscale with blue accent (Tamagui default style)

- Light: Pure white (#FFFFFF) to black (#000000) grayscale
- Dark: Pure black (#000000) to white (#FAFAFA) grayscale
- Perfect for: Minimalist, distraction-free UIs

### 6. **tokyoNight**

Celebrates the neon lights of Tokyo at night ([github.com/tokyo-night](https://github.com/tokyo-night/tokyo-night-vscode-theme))

- Light: Cool gray backgrounds with vibrant blue accents
- Dark: Deep navy with neon blue (#7AA2F7) and cyan accents
- Perfect for: Modern, vibrant interfaces with a tech aesthetic

### 7. **gruvbox**

Retro groove color scheme with warm, earthy tones ([github.com/morhetz/gruvbox](https://github.com/morhetz/gruvbox))

- Light: Warm cream (#FBF1C7) with muted blues and reds
- Dark: Warm dark brown (#282828) with retro pastel accents
- Perfect for: Warm, comfortable reading experiences

### 8. **solarized**

Precision colors for machines and people ([ethanschoonover.com/solarized](https://ethanschoonover.com/solarized))

- Light: Beige (#FDF6E3) with refined blue accents
- Dark: Deep teal (#002B36) with cyan and blue accents
- Perfect for: Low-contrast, eye-friendly interfaces
- Designed in CIELAB color space for optimal readability

### 9. **oneDark**

Atom's iconic dark theme ([github.com/atom/one-dark-syntax](https://github.com/atom/one-dark-syntax))

- Light: Clean white with blue (#4078F2) accents
- Dark: Charcoal (#282C34) with vibrant blue (#61AFEF) accents
- Perfect for: Familiar, developer-focused interfaces

### 10. **rosePine**

All natural pine, faux fur and a bit of soho vibes ([rosepinetheme.com](https://rosepinetheme.com))

- Light: Dawn - Warm cream (#FAF4ED) with muted teal accents
- Dark: Main - Deep purple (#191724) with pastel accents
- Perfect for: Elegant, sophisticated interfaces with personality

### 11. **apple**

iOS Human Interface Guidelines system colors ([developer.apple.com/design/human-interface-guidelines/color](https://developer.apple.com/design/human-interface-guidelines/color))

- Light: Pure white with iconic iOS blue (#007AFF) accents
- Dark: True black (#000000) with lighter blue (#0A84FF) accents
- Perfect for: Native iOS feel, maximum platform consistency
- Uses official Apple system colors that adapt to light/dark modes
- Features true black background in dark mode (ideal for OLED screens)

### 12. **coinbase**

Clean, professional design from Coinbase Design System ([github.com/coinbase/cds](https://github.com/coinbase/cds))

- Light: Pure white with UI blue (#3773F5) buttons
- Dark: Near-black (#0A0B0D) with lighter blue (#578BFA) buttons
- Perfect for: Professional, trustworthy fintech/crypto interfaces
- Uses official Coinbase mobile app UI colors from their open-source design system

## How to Switch Themes

Edit [palette.ts](./palette.ts) line 33:

```typescript
// Use Nord theme
export const themeColorSets = themes.nord;

// Use Dracula theme
export const themeColorSets = themes.dracula;

// Use Catppuccin theme
export const themeColorSets = themes.catppuccin;

// Use Minimal theme
export const themeColorSets = themes.minimal;

// Use Tokyo Night theme
export const themeColorSets = themes.tokyoNight;

// Use Gruvbox theme
export const themeColorSets = themes.gruvbox;

// Use Solarized theme
export const themeColorSets = themes.solarized;

// Use One Dark theme
export const themeColorSets = themes.oneDark;

// Use Rosé Pine theme
export const themeColorSets = themes.rosePine;

// Use Apple theme
export const themeColorSets = themes.apple;

// Use Coinbase theme
export const themeColorSets = themes.coinbase;
```

The change takes effect immediately after restarting the dev server or rebuilding the app.

## Creating Custom Themes

1. **Option 1: Add to themes.ts**

```typescript
export const myCustomTheme: Record<ThemeVariant, ThemeColorSet> = {
  light: {
    background: '#FFFFFF',
    backgroundStrong: '#F5F5F5',
    // ... other colors
  },
  dark: {
    background: '#000000',
    backgroundStrong: '#111111',
    // ... other colors
  },
};

// Add to the themes object
export const themes = {
  default: defaultTheme,
  nord: nordTheme,
  dracula: draculaTheme,
  catppuccin: catppuccinTheme,
  minimal: minimalTheme,
  custom: myCustomTheme, // Add here
} as const;
```

2. **Option 2: Direct assignment**

```typescript
// In palette.ts, replace the themes.default assignment:
export const themeColorSets: Record<ThemeVariant, ThemeColorSet> = {
  light: {
    // Your custom light theme
  },
  dark: {
    // Your custom dark theme
  },
};
```

## Theme Structure

Each theme must implement the `ThemeColorSet` interface:

```typescript
type ThemeColorSet = {
  // Backgrounds
  background: string; // Primary background
  backgroundStrong: string; // Stronger emphasis background
  backgroundHover: string; // Hover state background
  backgroundPress: string; // Press state background

  // Text colors
  color: string; // Primary text
  colorPress: string; // Press state text
  colorMuted: string; // Muted/secondary text

  // Accent colors
  accent: string; // Primary accent (buttons, links)
  accentHover: string; // Accent hover state
  accentPress: string; // Accent press state
  accentMuted: string; // Muted accent

  // Borders
  borderColor: string; // Default border
  borderColorPress: string; // Press state border
  outlineColor: string; // Focus outline

  // Surfaces
  surface: string; // Card/surface background
  secondaryBackground: string; // Secondary surface
  secondaryText: string; // Text on secondary surfaces

  // Status colors
  danger: string; // Error/destructive actions
  dangerHover: string; // Danger hover state
  dangerBackground: string; // Danger background (alerts)
};
```

## Color Contrast Guidelines

When creating custom themes, ensure:

- Text colors have at least 4.5:1 contrast ratio with backgrounds (WCAG AA)
- Interactive elements are clearly distinguishable
- Accent colors stand out from backgrounds
- Danger colors are visually distinct from accent colors

## Resources

- [Tamagui Themes Docs](https://tamagui.dev/docs/intro/themes)
- [Tamagui ThemeBuilder](https://tamagui.dev/docs/guides/theme-builder)
- [Nord Theme](https://www.nordtheme.com)
- [Dracula Theme](https://draculatheme.com)
- [Catppuccin](https://github.com/catppuccin/catppuccin)
