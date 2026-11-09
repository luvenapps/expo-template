# Screens and routes

Follow the [UI conventions](../src/AGENTS.md) when changing screens.

- Follow Expo Router's existing file-based route groups and typed routes. Read the
  relevant parent `_layout.tsx` files before changing routes or screen headers.
- Reuse `ScreenContainer` and existing Tamagui components and theme tokens.
- Preserve the app's optional-authentication flow; inspect existing auth gates
  before adding redirects or requiring a session.
- Check navigation and layout behavior on the affected platforms. Do not infer
  Android or web behavior from an iOS result.
- Keep business logic in the relevant `src/` domain where existing patterns allow.
- Put corresponding screen tests under `../__tests__/app/` and follow its instructions.
