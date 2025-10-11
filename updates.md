# Project Updates

## 2025-10-10

- **Design system on** — Tamagui is configured (`tamagui.config.ts`) and available through the new `AppProviders` wrapper so every screen shares fonts, spacing, and theme tokens.
- **Unified providers** — `src/ui/providers/AppProviders.tsx` centralises `GestureHandlerRootView`, `SafeAreaProvider`, Tamagui, and the status bar; `app/_layout.tsx` simply imports the wrapper via the `@/` alias.
- **Project scaffolding** — Added a lightweight `src/` folder structure (auth, data, notifications, state, sync, utils, ui) plus TypeScript/Jest path aliases (`@/*`) to keep upcoming modules organised.
- **Details screen refresh** — Converted `app/details.tsx` to Tamagui primitives with matching tests, keeping the starter UI consistent across routes.
- **Tabs scaffold** — Restructured Expo Router to add /(tabs) with Today + Settings placeholders and root redirect, aligning with future navigation.
- **Safe area padding** — Today and Settings screens now respect native safe-area insets to ensure hero copy is visible on iOS/Android builds.
- **Tamagui cleanup** — Replaced shorthand props with explicit padding/alignment on Details and Settings screens to standardise style usage.
- **ScreenContainer** — Added a shared safe-area aware layout component and migrated Today, Settings, and Details screens to it while removing Tamagui shorthands.
