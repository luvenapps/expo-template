# Agents Companion

This doc is for automation or coding agents that need the pragmatic details behind
the human-facing README. It focuses on deterministic commands, required tooling,
and codebase conventions so agents can run reliably without human context.

## Environment Baseline

- **Expo managed workflow** – Native `ios/` and `android/` folders are auto-generated during builds.
  Don't manually edit native code unless adding custom native modules.
- Node `24.1.0` is pinned in `.nvmrc`. Use `nvm use` (or install that exact
  version) before running any scripts.
- The project assumes the stock **npm** CLI. Keep `package-lock.json` in sync and
  avoid `yarn`/`pnpm` installs.
- Install dependencies with:
  - `npm ci` for clean, repeatable installs (preferred for CI/agents).
  - `npm install` if you need to mutate dependencies locally.
- `npm run troubleshoot` executes `scripts/troubleshoot.js`, which validates the
  local toolchain (Node, npm, Expo CLI, Java 17, Android SDK/adb, Xcode, Watchman, Maestro).
  CocoaPods is managed automatically by Expo during prebuild.
- If Expo packages drift, run `npx expo install` to realign native peer deps.

## Runtime Credentials

- Supabase credentials are **required at runtime**. Copy `.env.example` to
  `.env.local` and set:
  ```
  EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
  EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
  ```
- `src/auth/client.ts` throws on startup when those values are missing. Jest
  tests mock the client via `__tests__/setup.ts`, so no extra setup is needed for
  unit tests.
- Supabase auth is optional in the app shell; users can access the UI without a
  session, but sync workflows expect valid credentials.

## Core Commands

| Purpose            | Command                           | Notes                                                        |
| ------------------ | --------------------------------- | ------------------------------------------------------------ |
| Expo dev server    | `npm start`                       | Runs Metro/Expo; `prestart` triggers `npm run troubleshoot`. |
| iOS build (local)  | `npm run ios`                     | Requires Xcode + simulator.                                  |
| Android build      | `npm run android`                 | Requires Android SDK + emulator.                             |
| Web preview        | `npm run web`                     | Expo web.                                                    |
| Type check         | `npm run type-check`              | `tsc --noEmit`.                                              |
| Unit tests         | `npm test`                        | Uses `jest-expo`; coverage threshold is 80% overall.         |
| Lint               | `npm run lint`                    | ESLint config lives in `eslint.config.js`.                   |
| Format             | `npm run format` / `format:check` | Prettier 3.6 w/ repo-level ignore file.                      |
| Expo doctor        | `npm run doctor`                  | Deep peer dependency check.                                  |
| SQLite migrations  | `npm run db:generate` / `db:push` | Uses `drizzle-kit` (SQLite).                                 |
| E2E (Maestro) iOS  | `npm run e2e:ios`                 | Flows in `.maestro/flows`.                                   |
| E2E (Maestro) Andr | `npm run e2e:android`             | Saves artifacts under `e2e-artifacts/`.                      |

`build-run-checks.sh` runs format → lint → `npm test -- --coverage` and mirrors
the baseline CI expectations.

## Authentication & Session Management

- **Auth is optional** – Users can access the app without logging in (local-first approach).
- Session state managed via Zustand store (`src/auth/session.ts`).
- Supabase client configured in `src/auth/client.ts`.
- `onAuthStateChange` listener initialized in `src/ui/providers/AppProviders.tsx` via `initSessionListener()`.
- **Session persistence**: Currently uses memory-only storage. For production, implement
  `expo-secure-store` adapter for Supabase Auth to persist sessions across app restarts.
- **Auth flow**: Settings → Sign In button → `router.push('/(auth)/login')` → Login screen →
  successful login calls `router.replace('/(tabs)')`.
- **Sign out**: Calls Supabase `signOut()` and relies on the auth listener to clear the
  Zustand store; no explicit `getSession()` verification exists today.
- Session status: `'unknown'` (initial) → `'authenticated'` | `'unauthenticated'`.

## Navigation & Routing (Expo Router)

- **Route structure**:
  - `app/index.tsx` – Root redirect (always redirects to `/(tabs)`)
  - `app/_layout.tsx` – Root Stack navigator, registers route groups
  - `app/(auth)/` – Optional login flows (accessed from Settings)
    - `_layout.tsx` – Auth-specific Stack configuration
    - `login.tsx` – Sign in screen with Supabase auth
  - `app/(tabs)/` – Main app navigation (Tabs)
    - `_layout.tsx` – Tab navigator configuration
    - `index.tsx` – Home screen (Today view)
    - `settings/index.tsx` – Settings & auth controls

- **Header configuration hierarchy**:
  1. Root layout (`app/_layout.tsx`): Sets defaults for route groups
  2. Route group layout (e.g., `app/(auth)/_layout.tsx`): Can set group-level `screenOptions`
  3. Individual screens: Override with `<Stack.Screen options={{ ... }} />`

- **Common pattern for headers**:
  - Parent layout sets `headerShown: false` for route group
  - Child screen overrides with `<Stack.Screen options={{ headerShown: true, ... }} />`
  - This pattern is required due to nested Stack navigators in Expo Router

- **Platform differences**:
  - **iOS**: Back buttons require explicit `headerShown: true` on child screens;
    `headerBackTitle` customizes back button text
  - **Android**: More permissive with header inheritance
  - **Web**: Follows browser navigation patterns; back button = browser back

- **Typed routes**: Enabled via `experiments.typedRoutes` in `app.json`. Types auto-generated
  in `.expo/types/router.d.ts`.

## State Management (Zustand)

- **Zustand stores** are used for cross-component reactive state:
  - `src/auth/session.ts` → Authentication state and auth actions
  - `src/sync/` → Sync status, queue size, cursors

- **Pattern**:
  - Stores expose actions (e.g., `signInWithEmail`, `signOut`) and state slices
  - Components subscribe to specific slices: `useSessionStore((state) => state.status)`
  - Avoid direct state mutation; use actions

- **Integration with Supabase**:
  - `onAuthStateChange` listener calls `useSessionStore.getState().setSession(session)`
  - Keeps Zustand state in sync with Supabase auth state

- **Best practices**:
  - Let event listeners handle state updates (e.g., auth state changes)
  - Avoid race conditions by checking current state after async operations
  - Keep stores focused (single responsibility)

## Project Layout

- `app/` – Expo Router entry points. Typed routes enabled (`experiments.typedRoutes`).
  - `app/index.tsx` – Root redirect (always goes to `/(tabs)`)
  - `app/_layout.tsx` – Root Stack navigator with route group registration
  - `app/(auth)/` – Optional login flows (modal from Settings)
    - `_layout.tsx` – Auth Stack configuration
    - `login.tsx` – Sign in screen with email/password
  - `app/(tabs)/` – Main app navigation (Tabs)
    - `_layout.tsx` – Tab navigator (Home, Settings)
    - `index.tsx` – Home screen (Today view)
    - `settings/index.tsx` – Settings with auth controls and sync status
  - `app/details.tsx` – Placeholder detail screen

- `src/`
  - `auth/` – Supabase client, session store (Zustand), auth services
    - `client.ts` – Supabase client initialization
    - `session.ts` – Zustand store + session listener
    - `service.ts` – Auth actions (signIn, signOut, OAuth)
  - `config/` – Domain config (`DOMAIN`) used across UI/data
  - `data/`, `db/` – Drizzle repositories + SQLite schema
  - `sync/` – Outbox, cursor storage (MMKV fallback), sync engine/hooks
    - `cursors.ts` – MMKV-based cursor persistence
    - `useSync.ts` – Sync hook with background scheduling
  - `ui/` – Tamagui components, global providers
    - `components/` – Reusable UI components (e.g., `ScreenContainer`)
    - `providers/AppProviders.tsx` – Wraps app with contexts (SafeArea, Tamagui, QueryClient, session listener)
  - `utils/`, `state/`, `notifications/` – Helpers for broader features

- `__tests__/` – Mirrors `src/` tree with unit coverage
  - `setup.ts` – Jest configuration, mocks for Supabase, Expo modules, SQLite, background tasks
  - Coverage reports → `coverage/`, JUnit XML → `junit.xml`

- `docs/` – Contributor-facing docs
  - `roadmap.md` – Feature roadmap
  - `updates.md` – Change log and updates

Path aliases (`@/...`) are defined in `tsconfig.json`, `babel.config.js`, and
Jest config; prefer them over relative imports.

## Common Workflows

### Adding a New Screen

1. Create file in appropriate route group: `app/(tabs)/new-screen.tsx`
2. Register in parent layout if needed (Expo Router auto-discovers files)
3. Add Stack.Screen configuration if custom header needed
4. Import in tests: `__tests__/app/(tabs)/new-screen.test.tsx`
5. Use typed routes: `router.push('/(tabs)/new-screen')` with autocomplete

### Modifying Authentication Flow

1. **Session state**: Update `src/auth/session.ts` (Zustand store)
2. **Auth service**: Add/modify Supabase calls in `src/auth/service.ts`
3. **UI**: Update login screen `app/(auth)/login.tsx`
4. **Listener init**: Verify `initSessionListener()` called in `src/ui/providers/AppProviders.tsx`
5. **Test persistence**: Sign in → close app → reopen (should remain logged in with SecureStore)
6. **Test sign out**: Sign out → verify UI updates immediately (status changes to `'unauthenticated'`)

### Adding Background Sync Logic

1. Update sync hook: `src/sync/useSync.ts`
2. Modify push/pull functions: `src/sync/` (e.g., `pushOutbox`, `pullUpdates`)
3. Register background task if needed (see existing `expo-background-task` integration)
4. Mock in tests: Update `__tests__/setup.ts` mocks
5. **Test on native platforms only** – sync disabled on web (no SQLite)

### Debugging Navigation Issues

1. Check route exists in appropriate `_layout.tsx` file
2. Verify header configuration hierarchy: root → layout → screen
3. Test on **all platforms** (iOS, Android, Web) – behavior differs
4. Use `router.push()` for navigation, `router.back()` to return
5. Check console for navigation errors (e.g., route not found)
6. Verify typed routes in `.expo/types/router.d.ts` if using autocomplete

### Database Schema Changes

1. Update schema: `src/db/schema.ts` (Drizzle)
2. Generate migration: `npm run db:generate`
3. Apply migration: `npm run db:push` (dev) or migrations in production
4. Update TypeScript types to match schema
5. Update repositories in `src/data/` to use new schema
6. Test queries in unit tests

### Adding Native Modules (Expo)

1. Install package: `npx expo install <package-name>` (aligns peer dependencies)
2. Check if package requires native code changes in documentation
3. If native code changes needed: rebuild with `npm run ios` or `npm run android`
4. For config plugins: add to `app.json` `plugins` array
5. Regenerate native folders if needed: `npx expo prebuild --clean`
6. Update mocks in `__tests__/setup.ts` for the new native module
7. **Don't manually edit `ios/` or `android/` folders** – use Expo config plugins instead

## Testing

- **Unit tests**: `npm test` (Jest + jest-expo)
  - Coverage threshold: 80% overall → `coverage/` output, `junit.xml` for CI
  - Run sequentially if resource-constrained: `npm test -- --runInBand`
  - Config: `jest.config.js`, setup in `__tests__/setup.ts`

- **Mocks** (`__tests__/setup.ts`):
  - Supabase client (auth methods + session listener stubs)
  - Expo Constants (injects Supabase credentials during tests)
  - Expo SQLite sync APIs
  - Expo background task + task manager shims

- **E2E tests**: Maestro flows in `.maestro/flows/`
  - iOS: `npm run e2e:ios`
  - Android: `npm run e2e:android`
  - Requires local dev builds: `npm run ios` or `npm run android` (builds dev client)
  - Artifacts saved to `e2e-artifacts/`

- **When adding new modules**:
  - Extend `__tests__/setup.ts` mocks if module touches Expo native APIs
  - Avoid breaking Node test environment

## Debugging & Troubleshooting

### Metro Bundler Issues

- Clear cache: `npm start -- --clear`
- Kill existing processes: `pkill -f "expo start"` or `pkill -f "metro"`
- Remove stale cache: `rm -rf node_modules/.cache`
- Clear Watchman: `watchman watch-del-all`

### Module Resolution Errors

1. Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
2. Clear Metro cache: `npm start -- --reset-cache`
3. Clear npm cache: `npm cache clean --force`
4. Verify `package-lock.json` is in sync
5. Check for version conflicts: `npm ls <package-name>`

### Navigation Not Working

1. Verify route exists in `app/_layout.tsx` Stack.Screen list
2. Check header configuration hierarchy (root → layout → screen)
3. Test on all platforms (iOS/Android/Web) – behavior differs
4. Ensure `headerShown: true` on child screen if parent has `headerShown: false`
5. Check for navigation errors in Metro logs

### Session/Auth Issues

1. Verify `.env.local` has valid Supabase credentials
2. Check `onAuthStateChange` listener initialized in `AppProviders.tsx`
3. Confirm session state updates in Zustand store: `useSessionStore((state) => state.status)`
4. After sign-out, confirm `useSessionStore.getState().status === 'unauthenticated'`
5. For persistence issues: Implement an `expo-secure-store` (or similar) adapter for Supabase Auth

### Build Failures (Expo)

1. Clear Expo/Metro cache: `npm start -- --clear`
2. Regenerate native folders: `npx expo prebuild --clean`
3. Rebuild locally:
   - iOS: `npm run ios` (runs `expo run:ios`)
   - Android: `npm run android` (runs `expo run:android`)
4. Verify Java 17 for Android builds: `java -version`
5. Check Expo configuration: `npm run doctor`
6. Delete and regenerate native folders: `rm -rf ios android && npx expo prebuild`
7. For persistent issues, try: `rm -rf node_modules package-lock.json && npm install`

**Notes**:

- `ios/` and `android/` folders are auto-generated by Expo when running native builds
- These folders should be in `.gitignore` (managed by Expo, not manually edited)
- `eas build` is for cloud builds and requires Expo authentication; use `npm run ios`/`android` for local dev
- Don't manually edit native files unless using a custom dev client with native modules

## Background Tasks & Storage

- **Cursors**: Use `react-native-mmkv` on native platforms with in-memory fallback
  on web (`src/sync/cursors.ts`). MMKV IDs are sourced from `DOMAIN.app`.
- **Background sync**: Integrates `expo-background-task` and `expo-task-manager`.
  When adding tasks, register them through existing sync utilities to keep
  mocks working in tests.
- **Storage hierarchy**:
  - Native (iOS/Android): MMKV (fast, synchronous)
  - Web: Memory storage (fallback, no persistence)
  - Supabase auth sessions: Memory-only (needs SecureStore for persistence)

## Tooling & Hooks

- **Husky hooks** enforce quality gates:
  - `pre-commit`: `npx lint-staged` (runs lint + format checks on staged files)
  - `commit-msg`: `npx commitlint --edit` with conventional config

- **Commit messages**: Follow conventional format (`feat:`, `fix:`, `chore:`, etc.)
  - Use `npm run commit` for interactive Commitizen (`cz-git`) prompt

- **Code quality**:
  - ESLint config: `eslint.config.js`
  - Prettier: `.prettierrc` + `.prettierignore`
  - Pre-commit runs format + lint on staged files only

## Maintaining AGENTS.md

**Update this document when**:

- Adding/removing major dependencies (state libraries, navigation, etc.)
- Changing folder structure or adding new top-level directories
- Updating Node version, npm, or Expo SDK version
- Adding new npm scripts or changing build commands
- Introducing new architectural patterns (new Zustand store, navigation pattern, etc.)
- Changing environment variables or runtime requirements (e.g., new API keys)
- Adding new testing tools or CI workflows
- Changing authentication or session management approach
- Updating background task or storage strategies

**Do NOT duplicate**:

- Feature-level details (covered in `docs/updates.md` and commit history)
- API documentation (should live in code comments or separate API docs)
- Verbose implementation details (keep this doc high-level and actionable)

**Keep this doc focused on**: "What agents need to bootstrap, debug, and work effectively."

This guide should give agents enough detail to bootstrap, validate, and extend
the project without trawling contributor docs or commit history.
