# Application source

- Keep changes in the relevant domain and reuse existing utilities before adding
  abstractions. Read implementations and call sites before changing interfaces.
- Prefer Tamagui primitives and theme tokens. Reuse `ui/components/` for shared UI,
  including `ScreenContainer`, `FormField`, and semantic text components.
- Route user-visible errors through `useFriendlyErrorHandler`. Pass a toast
  controller only when a toast is needed; otherwise render the friendly message
  inline. Keep critical errors in banners, modals, or inline UI. Use the existing
  Tamagui toast for brief, non-blocking messages without duplicating inline errors.
- Keep user-facing copy translated through the existing i18n system.
- Use focused Zustand selectors and store actions; preserve existing session
  listeners and persistence behavior. Verify storage adapters instead of assuming
  authentication or other state is memory-only.
- Preserve native/web boundaries and fallback implementations, especially for
  SQLite, MMKV, notifications, and background sync. Update native mocks when needed.
- For database changes, read `../docs/database-migrations.md` and existing schema,
  migrations, and repositories together. Keep shared domain naming consistent.
- Read `../__tests__/AGENTS.md` when changing corresponding tests.
