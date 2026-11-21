# Theme and styling conventions

## Choosing the app palette

Set `activePaletteName` in [palette.ts](./palette.ts). The available palettes are
`default`, `nord`, `catppuccin`, `tokyoNight`, `gruvbox`, `rosePine`, `apple`, and
`coinbase`. This is an app configuration choice; users can choose system, light,
or dark mode in Appearance settings.

## Tamagui v3 style values

- Use unprefixed string tokens: `padding="4"`, `fontSize="3"`, and
  `borderRadius="2"`. Tamagui v3 does not use the v1 `$` prefix.
- Use theme keys for colors, such as `background`, `color-muted`, and
  `accent-color`.
- Use the named settings icon tokens for category colors and `overlayScrim` for
  modal dimming. OAuth provider brand colors and SVG logo colors remain local to
  the provider artwork.
- Do not use numeric literals or arbitrary `px` strings for fixed UI dimensions.
  Add or use a shared token instead. Numeric style values mean pixels, not token
  indexes.
- For native APIs that require numbers, use the canonical values from
  [`tokenValues.ts`](./tokenValues.ts). Computed geometry such as safe-area insets
  can remain numeric. SVG view-box geometry and icon size props follow their
  numeric APIs.
- Keep browser-only CSS values such as the OAuth button hover shadow centralized
  in [`shadows.ts`](./shadows.ts).
- Use the shared semantic text components and the named sizing recipes (`xs`,
  `md`, `lg`, `xl`, `xxl`) rather than per-screen font or control scales.
- ESLint rejects v1 `$` tokens, fixed numeric style props, inline pixel strings,
  and inline CSS colors in the app UI. Add new fixed values to the central token
  definitions.

Token values live in [`tokenValues.ts`](./tokenValues.ts), and the Tamagui theme
mapping and recipes live in [`tamagui.config.ts`](../../../tamagui.config.ts).
When a repeated value is missing, add it there and use its named string token in
components.
