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
- **SQLite scaffolding** — Installed expo-sqlite with Drizzle, added drizzle.config.ts, schema definitions, and helper scripts for upcoming offline data work.
- **Sync groundwork** — Added TanStack Query + Zustand deps, a reusable ScreenContainer, safe-area cursor storage (MMKV fallback), and outbox utilities for upcoming sync flows.
- **Sync utils tests** — Added unit coverage for queryClient singleton, cursor storage, repository helper, and outbox DB interactions using mock adapters.
- **Sync engine scaffold** — Added Zustand sync store, generic sync engine with tests, and mocked outbox/cursor coverage to keep infrastructure reusable.
- **Auth shell** — Added Supabase client/session store scaffolding with Zustand, plus initial auth listener test coverage.
- **Auth navigation** — Added /app/(auth) stack with placeholder login, session-aware root redirect, and updated tests for the new guard.
- **Auth service** — Extended session store with loading/error states, wired the login form to Supabase helpers, and added comprehensive tests while keeping auth optional.
- **Auth refactor: local-first** — Removed authentication wall; all users now access the full app immediately with local storage. Moved Sign In/Out to Settings screen, simplified root redirect.Authentication is now opt-in for sync and future premium features.
- **Sync manager** — Added useSync hook with auto scheduling and interval handling plus generic settings integration.
- **Notifications baseline** — Added reusable notification helpers with permission handling, scheduling, and Jest coverage across native/web fallbacks.
