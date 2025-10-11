# Project Updates

## 2025-10-10

- **Design system on** — Tamagui is configured (`tamagui.config.ts`) and available through the new `AppProviders` wrapper so every screen shares fonts, spacing, and theme tokens.
- **Unified providers** — `src/ui/providers/AppProviders.tsx` centralises `GestureHandlerRootView`, `SafeAreaProvider`, Tamagui, and the status bar; `app/_layout.tsx` simply imports the wrapper via the `@/` alias.
- **Project scaffolding** — Added a lightweight `src/` folder structure (auth, data, notifications, state, sync, utils, ui) plus TypeScript/Jest path aliases (`@/*`) to keep upcoming modules organised.
- **Details screen refresh** — Converted `app/details.tsx` to Tamagui primitives with matching tests, keeping the starter UI consistent across routes.
