# 🧭 __APP_NAME__

A modern, production-ready Expo React Native template with **TypeScript**, **Jest**, **ESLint**, **Prettier**, **Maestro (E2E)**, and a clean folder structure.

---

## 🧩 Features

✅ **Expo Router** — file-based navigation  
✅ **Jest + Testing Library** — unit testing  
✅ **ESLint + Prettier** — linting and formatting  
✅ **Maestro** — cross-platform E2E testing  
✅ **TypeScript** — strongly typed everywhere  
✅ **Auto-bootstrap postinstall script** — sets `appId` and cleans itself up  
✅ **Ready for GitHub templates** — no manual setup after creation

---

## ⚙️ Prerequisites

Before running this project, ensure the following tools are installed on macOS.

### 📱 Platform SDKs

#### 🧭 Xcode (for iOS)

- Download from the [Mac App Store](https://apps.apple.com/us/app/xcode/id497799835)
- After installing, open it once to accept the license.
- Then install command-line tools:
  ```bash
  xcode-select --install
  ```

#### 🤖 Android Studio (for Android)

- Download from the [official Android Studio site](https://developer.android.com/studio)
- Install with Android SDK, SDK Platform Tools, and an emulator image (API 34 or above).
- After installation, ensure these environment variables are set in your shell (`.zshrc` or `.bashrc`):

  ```bash
  export ANDROID_HOME=$HOME/Library/Android/sdk
  export PATH=$PATH:$ANDROID_HOME/emulator
  export PATH=$PATH:$ANDROID_HOME/platform-tools
  ```

Verify installation:

```bash
adb devices
```

### 🧩 Homebrew (Package Manager)

If you don’t already have [Homebrew](https://brew.sh/):

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Then run:

```bash
brew update
brew upgrade
```

### 🧭 Expo CLI (optional but recommended globally)

You can run Expo commands with `npx`, but installing globally is convenient:

```bash
npm install -g expo-cli
```

Check:

```bash
expo --version
```

### 🧩 Core dependencies (via Homebrew)

#### 🚀 Fastlane — for local iOS builds

Fastlane is required for EAS local iOS builds.

```bash
brew install fastlane
```

Verify installation:

```bash
fastlane --version
```

#### 🕵️‍♂️ Watchman — for fast rebuilds

```bash
brew install watchman
```

#### 🧰 Node.js (latest LTS recommended)

```bash
brew install node
```

### 🐋 Container Runtime (Supabase Local DB)

Supabase’s local stack runs inside Docker. Install a container engine and keep it running before you start Supabase:

- **Rancher Desktop** (recommended, free & lightweight): [rancherdesktop.io](https://rancherdesktop.io/)
- Alternatives: Docker Desktop or Colima

Once installed, launch the runtime (containerd or dockerd), then bootstrap Supabase locally:

```bash
npx supabase start
```

The CLI spins up Postgres/Auth/Storage via Docker Compose and prints local API credentials—copy them into `.env.local`.

### ☕ Java Runtime (for Maestro and Android builds)

Install OpenJDK 17 via Homebrew:

```bash
brew install openjdk@17
```

Then set it as the default JDK in your shell profile (~/.zshrc or ~/.bashrc):

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export PATH="$JAVA_HOME/bin:$PATH"
```

Verify installation:

```bash
java -version
```

Expected output:

```bash
openjdk version "17.x.x"
```

### 🧪 Maestro (E2E Testing)

Maestro is used for cross-platform end-to-end (E2E) testing on iOS and Android.

Follow the official installation guide for macOS here:  
🔗 **[Maestro Installation Docs](https://docs.maestro.dev/getting-started/installing-maestro/macos)**

After installing, verify it’s working:

```bash
maestro --version
```

If you see a message about Java missing, ensure you’ve installed it via:

```bash
brew install openjdk
```

---

### 🧩 Expo Template Install

Run the following command to setup your project:

```bash
npx create-expo-app <repo_name> --template https://github.com/luvenapps/expo-template
```

## 🧱 Project Structure

```
beontime/
├── .expo/                  # Expo project metadata
├── .husky/                 # Git hooks (pre-commit, lint checks)
├── .maestro/               # E2E tests (smoke.android.yaml, smoke.ios.yaml)
├── .vscode/                # VSCode project settings
├── android/                # Native Android project (created after 'expo run:android')
├── ios/                    # Native iOS project (created after 'expo run:ios')
├── app/                    # App source code and screens
│   ├── index.tsx           # Main entry screen
│   ├── index.test.tsx      # Unit test colocated with screen code
│   └── otherScreens.tsx
├──scripts/
    └── postinstall.js      → One-time setup (auto deletes itself)
├── assets/                 # Static images and fonts
├── jest.config.js          # Jest configuration
├── eslint.config.js        # ESLint configuration
├── .prettierrc.json        # Prettier formatting rules
├── tsconfig.json           # TypeScript configuration
├── package.json            # Dependencies and scripts
└── README.md               # Project documentation
```

---

## 🧩 Common Commands

| Action                        | Command                   |
| ----------------------------- | ------------------------- |
| Start Expo dev server         | `npm start`               |
| Run on iOS simulator          | `npm run ios`             |
| Run on Android emulator       | `npm run android`         |
| Run web preview               | `npm run web`             |
| Run Jest tests                | `npm test`                |
| Run Maestro tests (iOS)       | `npm run e2e:ios`         |
| Run Maestro tests (Android)   | `npm run e2e:android`     |
| Lint code                     | `npm run lint`            |
| Format code                   | `npm run format`          |
| Generate database migrations  | `npm run db:migrate`      |
| Start local Supabase          | `npm run supabase:dev`    |
| Deploy to production Supabase | `npm run supabase:deploy` |

---

## 🔧 Domain Configuration

This project uses a centralized domain configuration system to make it template-ready and easy to customize for different use cases.

### `src/config/domain.config.ts`

All app-specific and entity-specific naming is defined in a single configuration file. 

Example:

```typescript
export const DOMAIN = {
  app: {
    name: 'examples',
    displayName: 'Examples',
    database: 'examples.db',
    syncTask: 'examples-sync-task',
    storageKey: 'examples-supabase-session',
    cursorStorageId: 'examples-sync-cursors',
  },
  entities: {
    primary: {
      name: 'example',
      plural: 'examples',
      tableName: 'examples',
      remoteTableName: 'examples',
      displayName: 'Example',
    },
    entries: {
      name: 'entry',
      plural: 'entries',
      tableName: 'example_entries',
      remoteTableName: 'example_entries',
      displayName: 'Entry',
      foreignKey: 'exampleId',
    },
    // ... reminders, devices
  },
} as const;
```

### Benefits

- **Single Source of Truth** — Change entity names in one place to customize for different apps (e.g., tasks, workouts, notes)
- **Template-Ready** — Easy to fork and adapt for new projects
- **Type Safety** — Full TypeScript inference maintained throughout the codebase
- **Generic Naming** — Schema exports use generic names (`primaryEntity`, `entryEntity`) while table names remain configurable

### Usage

The codebase references configuration values instead of hardcoded strings:

```typescript
// Database schema
export const primaryEntity = sqliteTable(DOMAIN.entities.primary.tableName, { ... });

// Sync tables
const SYNC_TABLES = [
  DOMAIN.entities.primary.tableName,
  DOMAIN.entities.entries.tableName,
  // ...
] as const;

// Database file (async for better performance)
const db = await openDatabaseAsync(DOMAIN.app.database);
```

## 🗄️ Supabase Backend

The sync contract now has a Supabase implementation that mirrors the SQLite schema and powers multi-device sync.

### Local vs Hosted Supabase (choose an environment first)

- **Local development**: Run `npm run supabase:dev`. The script:
  - boots the Supabase Docker stack (`supabase start`)
  - shows connection details (`supabase status --env`)
  - applies migrations using `.env.local`
  - serves edge functions with auto-reload (`supabase functions serve`)
    Keep the terminal open; press Ctrl+C to stop everything (it calls `supabase stop` for you).
- **Hosted Supabase**: Populate `.env.prod` (or CI secrets) with your hosted credentials and run `npm run supabase:deploy` locally or in CI. The script pushes migrations and deploys all edge functions with the provided credentials.
- Keep credentials per environment; never mix local Docker keys with production.

### Schema Migrations (Drizzle ORM)

This project uses **Drizzle ORM** to generate Postgres migrations from TypeScript schemas. The schema is defined in `src/db/postgres/schema.ts` and uses the DOMAIN configuration to stay generic.

**Generate migrations:**

```bash
npm run db:generate:postgres
```

This command:

1. Generates Drizzle migration SQL in `supabase/migrations/`
2. Auto-generates RLS policies from DOMAIN config
3. Appends RLS policies to the migration file
4. Handles Drizzle limitations (partial indexes, WHERE clauses)

**Apply migrations:**

```bash
# Local development
npm run supabase:dev  # Auto-applies migrations via .env.local

# Production deployment
npm run supabase:deploy  # Applies to hosted Supabase via .env.prod

# Or apply directly
npm run supabase:push  # Uses current Supabase CLI config
```

**Important**: When changing DOMAIN config (renaming tables/entities):

1. Update `src/config/domain.config.ts`
2. Update both `src/db/sqlite/schema.ts` and `src/db/postgres/schema.ts`
3. Run `npm run db:generate` for SQLite
4. Run `npm run db:generate:postgres` for Postgres
5. The edge functions will automatically use the new names (they import DOMAIN)

See [docs/database-migrations.md](docs/database-migrations.md) for detailed migration workflows.

### Edge Functions

- **Edge Functions** (`sync-push`, `sync-pull`, `export`) reside in `supabase/functions`.
- The Supabase CLI ships with the repo (dev dependency). Use `npm exec supabase -- --version` to confirm it's available without a global install.
- Deploy them individually:
  ```bash
  npx supabase functions deploy sync-push
  npx supabase functions deploy sync-pull
  npx supabase functions deploy export
  ```
- The functions import shared DOMAIN types from `supabase/functions/_shared/domain.ts`, so table names stay aligned with the template.
- Use `supabase functions serve <name>` for local iteration—the CLI hot-reloads the Deno runtime.
- The helper scripts `npm run supabase:dev` and `npm run supabase:deploy` wrap these commands for local and hosted workflows respectively.

## 🗄️ Supabase Backend

The sync contract now has a Supabase implementation that mirrors the SQLite schema and powers multi-device sync.

### Local vs Hosted Supabase (choose an environment first)

- **Local development**: Run `npm run supabase:dev`. The script:
  - boots the Supabase Docker stack (`supabase start`)
  - shows connection details (`supabase status --env`)
  - applies migrations using `.env.local`
  - serves edge functions with auto-reload (`supabase functions serve`)
    Keep the terminal open; press Ctrl+C to stop everything (it calls `supabase stop` for you).
- **Hosted Supabase**: Populate `.env.prod` (or CI secrets) with your hosted credentials and run `npm run supabase:deploy` locally or in CI. The script pushes migrations and deploys all edge functions with the provided credentials.
- Keep credentials per environment; never mix local Docker keys with production.

### Schema Migrations (Drizzle ORM)

This project uses **Drizzle ORM** to generate Postgres migrations from TypeScript schemas. The schema is defined in `src/db/postgres/schema.ts` and uses the DOMAIN configuration to stay generic.

**Generate migrations:**

```bash
npm run db:generate:postgres
```

This command:

1. Generates Drizzle migration SQL in `supabase/migrations/`
2. Auto-generates RLS policies from DOMAIN config
3. Appends RLS policies to the migration file
4. Handles Drizzle limitations (partial indexes, WHERE clauses)

**Apply migrations:**

```bash
# Local development
npm run supabase:dev  # Auto-applies migrations via .env.local

# Production deployment
npm run supabase:deploy  # Applies to hosted Supabase via .env.prod

# Or apply directly
npm run supabase:push  # Uses current Supabase CLI config
```

**Important**: When changing DOMAIN config (renaming tables/entities):

1. Update `src/config/domain.config.ts`
2. Update both `src/db/sqlite/schema.ts` and `src/db/postgres/schema.ts`
3. Run `npm run db:generate` for SQLite
4. Run `npm run db:generate:postgres` for Postgres
5. The edge functions will automatically use the new names (they import DOMAIN)

See [docs/database-migrations.md](docs/database-migrations.md) for detailed migration workflows.

### Edge Functions

- **Edge Functions** (`sync-push`, `sync-pull`, `export`) reside in `supabase/functions`.
- The Supabase CLI ships with the repo (dev dependency). Use `npm exec supabase -- --version` to confirm it's available without a global install.
- Deploy them individually:
  ```bash
  npx supabase functions deploy sync-push
  npx supabase functions deploy sync-pull
  npx supabase functions deploy export
  ```
- The functions import shared DOMAIN types from `supabase/functions/_shared/domain.ts`, so table names stay aligned with the template.
- Use `supabase functions serve <name>` for local iteration—the CLI hot-reloads the Deno runtime.
- The helper scripts `npm run supabase:dev` and `npm run supabase:deploy` wrap these commands for local and hosted workflows respectively.

---

## 🧭 EAS Project Setup

Before using local or CI builds, create an EAS project for your app on Expo:

1. Go to [https://expo.dev/](https://expo.dev/) and sign in or create an account.
2. Create a new project and note its **Project ID**.
3. Run the command `eas init --id <Project_ID>`

It should update you `app.json` with

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "YOUR_PROJECT_ID"
      }
    }
  }
}
```

This ID links your local or CI builds to your Expo project so that features like builds, submissions, and updates work correctly.

---

## 📊 Analytics & Messaging

- Firebase Analytics + Firebase In-App Messaging (IAM) power observability; Supabase remains the backend for auth/sync and `expo-notifications` handles local reminders.
- Native builds include Firebase only when `TURN_ON_FIREBASE=true` (see `plugins/withFirebaseConfig.js`); provide `credentials/GoogleService-Info.plist` and `credentials/google-services.json` (or base64 secrets in CI) when enabled.
- Web requires the Firebase web keys in `.env.local` (`EXPO_PUBLIC_FIREBASE_*`).
- Details and steps: see [`docs/firebase-setup.md`](docs/firebase-setup.md).

---

## ⚙️ Continuous Integration (GitHub Actions)

This project includes a comprehensive GitHub Actions workflow to automate testing, linting, and building for multiple platforms. The CI pipeline runs unit tests with Jest, linting checks with ESLint, and end-to-end tests using Maestro on both iOS and Android environments. It also supports building the app for production to ensure the build process remains stable.

For teams using self-hosted runners, detailed setup instructions are provided to configure macOS and Linux runners with all necessary dependencies installed, including Node.js, Expo CLI, Java (for Maestro), and Android/iOS build tools. Environment variables and secrets are managed securely via GitHub repository settings.

The workflows are designed to trigger on pull requests and pushes to main branches, providing fast feedback on code quality and preventing regressions before merging. This setup enables a smooth and reliable continuous integration process tailored for React Native projects using Expo and Maestro.

For full detailed instructions on configuring the GitHub Actions workflows and setting up self-hosted runners, please see the [Github Actions document](docs/GITHUBACTIONS.md).

---

## 🛠️ Development Workflow

### Initial Setup (First Time)

Follow these steps in order when setting up the project for the first time:

1. **Install prerequisites**
   - Node 24.x
   - Expo toolchain
   - Container runtime (Rancher Desktop or Docker Desktop)
   - Java 17 (for Android/Maestro)
   - Xcode (macOS only, for iOS)

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Create `.env.local` file**:

   ```bash
   cp .env.example .env.local
   ```

4. **Generate database migrations** (IMPORTANT - Do this before starting!):

   ```bash
   npm run db:migrate
   ```

   This creates migration files for both SQLite (mobile) and Postgres (Supabase).

   💡 If you get "No SQLite migrations found!" error later, see the [Troubleshooting Migration Issues](#making-schema-changes) section.

5. **Start local Supabase** (Terminal 1):

   ```bash
   npm run supabase:dev
   ```

   - Starts Docker containers
   - Applies Postgres migrations
   - Serves Edge Functions
   - Prints connection credentials
   - **Keep this terminal running**

6. **Start Expo development server** (Terminal 2):

   ```bash
   npm start
   ```

   - Automatically runs system checks (including migration validation)
   - Starts Metro bundler
   - Choose how to run the app:

   **Option A: Web (Recommended for quick start)**

   ```
   Press 'w' - Opens in your browser
   ✅ No build required
   ⚠️  Note: Background sync disabled on web (SQLite requires native)
   ```

   **Option B: Expo Go (Quick mobile testing)**

   ```
   1. Install Expo Go app on your phone
   2. Press 'i' (iOS) or 'a' (Android)
   3. Scan QR code with Expo Go
   ✅ No build required
   ⚠️  Note: Some native features may not work
   ```

   **Option C: Development Build (Full native features)**

   ```
   # First time only - build the app
   npx expo prebuild           # Generate native projects

   # iOS Simulator (default)
   npx expo run:ios            # Builds to iOS simulator

   # iOS Physical Device (if connected)
   npx expo run:ios --device   # Prompts to select your device

   # Android (auto-detects connected device, then emulator)
   npx expo run:android        # Prefers physical device if connected

   # After first build, just press:
   Press 'i' (iOS) or 'a' (Android) to launch

   ⚠️  Note: 'i' defaults to simulator, not physical iOS device
   💡 For physical iOS device: use Expo Go OR rebuild with --device flag
   ✅ Full native features (SQLite, background sync, etc.)
   ```

7. **Run the app** and verify:
   - ✅ App launches without errors
   - ✅ You can create an account
   - ✅ Data syncs between local (SQLite) and Supabase (Postgres)

### Build size checklist

Before shipping preview/production builds, follow [`docs/build-size.md`](docs/build-size.md):

- Measure IPA/AAB artifacts via `node scripts/report-build-size.mjs <path>`.
- Generate bundle reports with the commands in the doc (based on `npx react-native bundle`).
- Keep Android artifacts ≤ 25 MB and iOS artifacts ≤ 30 MB; investigate any regressions before submitting to the stores.

### Deployment scripts

- `npm run build:preview:ios` / `npm run build:preview:android` – internal preview builds (staging Supabase).
- `npm run build:prod:ios` / `npm run build:prod:android` – production builds with auto-incremented versions.
- `npm run submit:prod:ios` / `npm run submit:prod:android` – upload the latest artifacts to TestFlight / Google Play Internal Testing (requires `eas submit` credentials configured in `eas.json`).
- `npm run version:bump -- --type patch|minor|major` – bumps `package.json`/`app.json` versions and increments iOS/Android build numbers automatically.

### Social authentication setup

We implement Supabase’s [Expo React Native social auth quickstart](https://supabase.com/docs/guides/auth/quickstarts/with-expo-react-native-social-auth), which uses Expo Linking + AuthSession to drive Supabase’s hosted OAuth flows. Use that guide as your source of truth; the notes below capture BetterHabits-specific details.

1. **Register callback URLs**
   - In Supabase Studio’s _Authentication → URL Configuration_, add both `betterhabits://auth/callback` and your deployed web URL (e.g., `https://yourdomain.com/auth/callback`).
   - The native scheme `betterhabits` is already declared in `app.json`; don’t change it unless you update every OAuth redirect.
2. **Enable providers (Studio)**
   - Go to _Authentication → Providers_ and toggle Apple + Google on.
   - Paste the client IDs/secrets from Apple Developer/Google Cloud. Supabase stores them securely and the Expo app reuses the same anon key.
   - The quickstart doc shows the exact Apple Services ID + Google OAuth settings for Expo.
3. **Restart local services**
   - If you run Supabase locally (`npm run supabase:dev`), restart it so the provider config takes effect.
   - Restart Metro (`npm start`) and rebuild native dev clients after flipping providers on/off.
4. **Test the flows**
   - Native: tapping “Continue with …” opens the system browser overlay (Chrome Custom Tabs or ASWebAuthenticationSession). Once the Supabase redirect hits `betterhabits://auth/callback`, the session listener updates Zustand.
   - Web: the login page redirects in the same tab; after sign-in, Supabase sends the browser back to `https://<project>.supabase.co/auth/v1/callback` which returns to your app.

**Provider-specific tips**:

- **Apple** – You need an Apple Developer Program membership. Create a Services ID + Sign in with Apple key, set the callback to `https://<project>.supabase.co/auth/v1/callback`, and paste the credentials into Supabase.
- **Google** – Create OAuth client IDs for iOS, Android, and Web. Use the bundle id/package `com.luvenapps.betterhabits` for native clients, and the Supabase callback URL for web.
- **CLI-only setups** – If you prefer not to open the hosted Studio, you can configure providers through SQL per the quickstart doc (insert rows in `auth.external_providers`). Either way, the Expo client doesn’t need additional env vars beyond `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

After following the quickstart, the “Continue with Apple/Google” buttons in `app/(auth)/login.tsx` should launch the appropriate flows on iOS, Android, and web without additional code changes.

#### Email sign up & password reset

- `app/(auth)/signup.tsx` reuses the login form primitives so users can create accounts with email/password (plus the same friendly-error surface).
- `app/(auth)/forgot-password.tsx` sends Supabase reset links. The login screen links to both routes so users can switch between sign in, sign up, and password recovery without leaving the auth stack.

### Analytics & Messaging

- Firebase Analytics + Firebase In-App Messaging are the current observability stack; Supabase still powers auth/sync, and `expo-notifications` handles local reminders.
- Native builds load Firebase via the config plugin (`credentials/GoogleService-Info.plist`, `credentials/google-services.json`). Expo web initializes Firebase when `.env.local` defines `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`, `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `EXPO_PUBLIC_FIREBASE_APP_ID`, `EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID`.
- `docs/firebase-setup.md` walks through generating those files/vars. Once they exist, `AnalyticsProvider` forwards events, errors, and perf metrics to Firebase; otherwise it keeps logging envelopes locally.

### Daily Development

1. **Start Supabase** (Terminal 1):

   ```bash
   npm run supabase:dev
   ```

2. **Start Expo** (Terminal 2):

   ```bash
   npm start
   ```

3. **Code and iterate**:
   - Save code → Metro hot reloads the UI automatically
   - Edit Edge Functions → Supabase CLI auto-reloads them
   - Run tests: `npm test -- --coverage`
   - On native dev builds, use **Settings → Developer Tools** to seed sample records, clear the outbox, and manually trigger sync checks before testing on device.

4. **Shut down**:
   - Stop Expo: `Ctrl+C` (Terminal 2)
   - Stop Supabase: `Ctrl+C` (Terminal 1)

**Platform-Specific Storage:**

| Platform        | Application Data                         | Session/Settings      | Offline Support                   |
| --------------- | ---------------------------------------- | --------------------- | --------------------------------- |
| **iOS/Android** | SQLite database                          | MMKV (native storage) | ✅ Full offline support           |
| **Web**         | Supabase + React Query (IndexedDB cache) | localStorage          | ⚠️ Cached reads; full offline TBD |

**Current Limitations & Future Improvements:**

- Web now caches Supabase data via React Query with IndexedDB persistence
- Cached reads work offline temporarily, but background sync/service workers are still pending
- **Next**: Implement service worker + background sync for full offline parity with native apps

### Testing on Physical Devices

4. **Configure preview/staging credentials**:

   ```bash
   cp .env.preview.example .env.preview
   # replace the Supabase + analytics values with your preview/staging project
   ```

   The preview file is used when running `eas build --profile preview` (or `--profile production` once those credentials are set as EAS secrets). It mirrors `.env.prod`, but points at your staging Supabase project so internal testers don’t pollute production data.

When testing on a **physical phone or tablet**, the device needs to connect to Supabase running on your Mac. By default, `.env.local` uses `127.0.0.1` (localhost), which only works for simulators running on the same machine.

**Step-by-step setup:**

1. **Find your Mac's local IP address**:

   ```bash
   ipconfig getifaddr en0
   ```

   This returns your local network IP (e.g., `192.168.1.100`)

2. **Update `.env.local` with your local IP**:

   ```bash
   # Before (only works for simulators)
   EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321

   # After (works for physical devices on same network)
   EXPO_PUBLIC_SUPABASE_URL=http://192.168.1.100:54321
   ```

   **Replace `192.168.1.100` with your actual IP from step 1**

3. **Restart Expo to pick up the new URL**:

   ```bash
   # Stop Expo (Ctrl+C in Terminal 2)
   npm start
   ```

   **Note**: You don't need to restart Supabase - it's already accessible on your network

4. **Connect from your phone**:
   - Ensure your phone is on the **same WiFi network** as your Mac
   - Scan the QR code from Expo
   - The app will now connect to Supabase running on your Mac

**Important notes:**

- ⚠️ **Don't commit your local IP to git** - it's machine-specific
- 🔄 Switch back to `127.0.0.1` when using simulators or before committing
- 🔥 If connection fails, check macOS firewall settings for port 54321
- 📱 Both devices must be on the same local network

**Troubleshooting connection issues:**

```bash
# Check if Supabase is listening on port 54321
lsof -i :54321

# Test connectivity from your phone's browser
# Open: http://YOUR_IP:54321/health
```

### Making Schema Changes

This project uses **Drizzle ORM** for both SQLite (local) and Postgres (Supabase) schemas. All schemas are driven by the DOMAIN configuration.

**Step-by-step workflow:**

1. **Edit BOTH schema files** (keep them in sync):
   - `src/db/sqlite/schema.ts` (local mobile database)
   - `src/db/postgres/schema.ts` (remote Supabase database)

2. **Generate migrations IMMEDIATELY**:

   ```bash
   npm run db:migrate
   ```

   - ✅ Generates SQLite migration files → `src/db/sqlite/migrations/`
   - ✅ Generates Postgres migration files → `supabase/migrations/`
   - ✅ Auto-generates RLS policies for Postgres
   - ⚠️ **Don't skip this step!** The app checks for missing migrations on startup.

3. **Review the generated files**:
   - Check migration SQL for correctness
   - Verify RLS policies match your security requirements
   - Run automated validation: `npm test -- --coverage`

4. **Test locally**:

   ```bash
   # Restart Supabase to apply Postgres migrations
   npm run supabase:dev   # Applies new Postgres migrations

   # Restart the app to apply SQLite migrations
   npm start              # Press 'r' to reload app on device
   ```

5. **Commit everything together**:

   ```bash
   git add src/db/*/schema.ts src/db/sqlite/migrations/ supabase/migrations/
   git commit -m "feat: update database schema"
   ```

6. **Deploy to production** (when ready):
   ```bash
   npm run supabase:deploy
   ```

**Troubleshooting Migration Issues:**

If you see **"❌ No SQLite migrations found!"** when running `npm start`:

```bash
# Option 1: Force regenerate SQLite migrations only (for SQLite-specific issues)
rm -rf src/db/sqlite/migrations/meta
npm run db:generate  # Low-level: only generates SQLite migrations

# Option 2: Clean and regenerate ALL migrations (recommended)
npm run db:clean
npm run db:migrate  # High-level: generates SQLite + Postgres + RLS
```

This happens when migration metadata exists but SQL files are missing (common after cloning or git operations).

**Command Reference:**

- ✅ **Use `npm run db:migrate`** - Normal workflow (generates both databases + RLS policies)
- 🔧 **Use `npm run db:generate`** - Only for troubleshooting SQLite-specific issues

**Important Notes:**

- ⚠️ Always run `npm run db:migrate` immediately after editing schemas
- ✅ The `npm start` command automatically checks if migrations are missing
- 📝 Both schema files must stay in sync - edit them together
- 🔒 RLS policies are auto-generated from DOMAIN config

**Having trouble?** See [docs/database-migrations.md](docs/database-migrations.md) for detailed workflows and troubleshooting.

### Resetting Databases

During development, you may need to clear your local databases to start with a clean slate. This project has two databases that can be reset independently.

#### Clearing Local SQLite Database (Mobile App Data)

**Option 1: Use Developer Tools UI** (Recommended)

1. Open the app on a **native build** (iOS/Android)
2. Go to **Settings → Developer Tools**
3. Tap **"Clear local database"**
4. This deletes all local records (habits, entries, reminders, devices, outbox)

**Option 2: Delete the SQLite file** (Nuclear option)

```bash
# iOS Simulator
rm ~/Library/Developer/CoreSimulator/Devices/*/data/Containers/Data/Application/*/Library/LocalDatabase/betterhabits.db

# Android Emulator
adb shell run-as com.luvenapps.betterhabits rm /data/data/com.luvenapps.betterhabits/databases/betterhabits.db

# Or just uninstall/reinstall the app
```

#### Clearing Local Supabase Database (Postgres)

**Reset the entire Supabase stack:**

```bash
# Ensure Supabase is running first
npm run supabase:dev  # Or check if already running

# In another terminal, reset database and reapply migrations
npx supabase db reset

# The reset command will:
# - Drop and recreate the Postgres database
# - Reapply all migrations from supabase/migrations/
# - Reset auth users
# ⚠️  Delete all data - use only for local development

# Continue with Supabase still running, or restart if needed
```

**Important**: Supabase containers must be running when you execute `npx supabase db reset` - the command needs an active database connection to perform the reset.

#### Clearing Production Supabase (Use with extreme caution)

**⚠️ WARNING: This deletes production data permanently!**

If you need to reset your **hosted Supabase** (not recommended):

1. Log in to [supabase.com](https://supabase.com)
2. Go to your project → **Database** → **SQL Editor**
3. Manually drop tables or use the dashboard to delete records
4. Or, in extreme cases, delete and recreate the project

**Better approach for production:** Use database seeds and migrations rather than resets.

#### When to Use Each Reset

| Scenario                          | Solution                                       |
| --------------------------------- | ---------------------------------------------- |
| Testing fresh install flow        | Clear SQLite (Developer Tools button)          |
| Sync conflicts during development | Clear SQLite + Clear outbox                    |
| Schema migration gone wrong       | Reset local Supabase (`npx supabase db reset`) |
| Starting a new feature branch     | Clear both databases                           |
| Production issues                 | **Never reset** - debug and fix data instead   |

#### Reset Checklist

Before resetting databases:

- ✅ Ensure you don't need any existing test data
- ✅ Stop any running sync operations
- ✅ Consider exporting data if needed (Settings → Export to CSV)
- ✅ Restart the app after SQLite reset
- ✅ Restart Supabase after Postgres reset

---

## 📚 Documentation

### Architecture & Design

- **[Architecture Overview](docs/architecture.md)** - System design, data flow, platform differences
- **[Database Migrations](docs/database-migrations.md)** - Schema changes and migration workflows
- **[Schema Architecture](docs/schema-architecture.md)** - Why two schemas and how they stay in sync
- **[Web Caching Strategy](docs/web-caching-strategy.md)** - Planned React Query implementation
- **[Roadmap](docs/roadmap.md)** - Current status and upcoming milestones

---

## 🛠️ Development Workflow

### Initial Setup (First Time)

Follow these steps in order when setting up the project for the first time:

1. **Install prerequisites**
   - Node 24.x
   - Expo toolchain
   - Container runtime (Rancher Desktop or Docker Desktop)
   - Java 17 (for Android/Maestro)
   - Xcode (macOS only, for iOS)

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Create `.env.local` file**:

   ```bash
   cp .env.example .env.local
   ```

4. **Generate database migrations** (IMPORTANT - Do this before starting!):

   ```bash
   npm run db:migrate
   ```

   This creates migration files for both SQLite (mobile) and Postgres (Supabase).

5. **Start local Supabase** (Terminal 1):

   ```bash
   npm run supabase:dev
   ```

   - Starts Docker containers
   - Applies Postgres migrations
   - Serves Edge Functions
   - Prints connection credentials
   - **Keep this terminal running**

6. **Start Expo development server** (Terminal 2):

   ```bash
   npm start
   ```

   - Automatically runs system checks (including migration validation)
   - Starts Metro bundler
   - Press `i` for iOS, `a` for Android, `w` for web

7. **Run the app** and verify:
   - ✅ App launches without errors
   - ✅ You can create an account
   - ✅ Data syncs between local (SQLite) and Supabase (Postgres)

### Daily Development

1. **Start Supabase** (Terminal 1):

   ```bash
   npm run supabase:dev
   ```

2. **Start Expo** (Terminal 2):

   ```bash
   npm start
   ```

3. **Code and iterate**:
   - Save code → Metro hot reloads the UI automatically
   - Edit Edge Functions → Supabase CLI auto-reloads them
   - Run tests: `npm test -- --coverage`

4. **Shut down**:
   - Stop Expo: `Ctrl+C` (Terminal 2)
   - Stop Supabase: `Ctrl+C` (Terminal 1)

**Platform-Specific Storage:**

| Platform        | Application Data                         | Session/Settings      | Offline Support                 |
| --------------- | ---------------------------------------- | --------------------- | ------------------------------- |
| **iOS/Android** | SQLite database                          | MMKV (native storage) | ✅ Full offline support         |
| **Web**         | Direct Supabase queries (no caching yet) | localStorage          | ❌ Requires internet connection |

**Current Limitations & Future Improvements:**

- Web currently makes direct Supabase queries without caching
- React Query is configured but not yet implemented for data fetching
- **Future**: Implement React Query for in-memory caching and better UX
- **Future**: Add React Query persisters + IndexedDB for offline web support

### Making Schema Changes

This project uses **Drizzle ORM** for both SQLite (local) and Postgres (Supabase) schemas. All schemas are driven by the DOMAIN configuration.

**Step-by-step workflow:**

1. **Edit BOTH schema files** (keep them in sync):
   - `src/db/sqlite/schema.ts` (local mobile database)
   - `src/db/postgres/schema.ts` (remote Supabase database)

2. **Generate migrations IMMEDIATELY**:

   ```bash
   npm run db:migrate
   ```

   - ✅ Generates SQLite migration files → `src/db/sqlite/migrations/`
   - ✅ Generates Postgres migration files → `supabase/migrations/`
   - ✅ Auto-generates RLS policies for Postgres
   - ⚠️ **Don't skip this step!** The app checks for missing migrations on startup.

3. **Review the generated files**:
   - Check migration SQL for correctness
   - Verify RLS policies match your security requirements
   - Run automated validation: `npm test -- --coverage`

4. **Test locally**:

   ```bash
   # Restart Supabase to apply Postgres migrations
   npm run supabase:dev   # Applies new Postgres migrations

   # Restart the app to apply SQLite migrations
   npm start              # Press 'r' to reload app on device
   ```

5. **Commit everything together**:

   ```bash
   git add src/db/*/schema.ts src/db/sqlite/migrations/ supabase/migrations/
   git commit -m "feat: update database schema"
   ```

6. **Deploy to production** (when ready):
   ```bash
   npm run supabase:deploy
   ```

**Important Notes:**

- ⚠️ Always run `npm run db:migrate` immediately after editing schemas
- ✅ The `npm start` command automatically checks if migrations are missing
- 📝 Both schema files must stay in sync - edit them together
- 🔒 RLS policies are auto-generated from DOMAIN config

**Having trouble?** See [docs/database-migrations.md](docs/database-migrations.md) for detailed workflows and troubleshooting.

---

## 📚 Documentation

### Architecture & Design

- **[Architecture Overview](docs/architecture.md)** - System design, data flow, platform differences
- **[Database Migrations](docs/database-migrations.md)** - Schema changes and migration workflows
- **[Schema Architecture](docs/schema-architecture.md)** - Why two schemas and how they stay in sync
- **[Web Caching Strategy](docs/web-caching-strategy.md)** - Planned React Query implementation
- **[Roadmap](docs/roadmap.md)** - Current status and upcoming milestones

---

## 🛠️ Development Workflow

### Initial Setup

1. **Install prerequisites** (Node 24.x, Expo toolchain, container runtime such as Rancher Desktop, Java 17, etc.).
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Start the local Supabase stack** (new terminal):

   ```bash
   npm run supabase:dev
   ```

   - Boots Docker services, prints credentials, applies migrations via `.env.local`, and serves edge functions. Leave this terminal running; press `Ctrl+C` to stop and clean up.

4. **Launch Expo** (separate terminal):

   ```bash
   npm start
   ```

   - Use the Expo CLI prompts to run on iOS (`i`), Android (`a`), or web (`w`).

5. **Iterate**:
   - Save code → Metro hot reloads the UI.
   - Edge functions auto-reload via the Supabase CLI.
   - If Supabase isn't needed, skip step 3—the app still works against local SQLite (native) or in-memory state (web).
6. **Run tests**:
   ```bash
   npm test
   ```
7. **Shut down**:
   - Stop Expo (`Ctrl+C`).
   - Stop the Supabase terminal (`Ctrl+C`); the helper script calls `supabase stop` for you.

### Making Schema Changes

This project uses **Drizzle ORM** for both SQLite (local) and Postgres (Supabase) schemas. All schemas are driven by the DOMAIN configuration.

**Quick workflow:**

1. **Update schemas** (keep both in sync):
   - `src/db/sqlite/schema.ts` (local)
   - `src/db/postgres/schema.ts` (remote)

2. **Generate migrations**:

   ```bash
   npm run db:migrate
   ```

   This generates migrations for both SQLite and Postgres, including RLS policies.

3. **Review generated files**:
   - SQLite: `src/db/sqlite/migrations/`
   - Postgres: `supabase/migrations/`
   - Automated validation runs in test suite (validates RLS policies, indexes, foreign keys, etc.)

4. **Test & deploy**:
   ```bash
   npm start              # SQLite migrations auto-apply
   npm run supabase:dev   # Test Postgres locally
   npm run supabase:deploy # Deploy to production
   ```

**That's it!** For detailed workflows, troubleshooting, and advanced usage, see [docs/database-migrations.md](docs/database-migrations.md).

---

### 🧩 Misc

Connect code coverage to a tool lile CodeCov. Generate a token in CodeCov and add it to the repo's Github secrets

Add to your selfhosted workflow and ci-quality.yml after the unit test run with coverage.

```
- name: Install GPG
  run: |
    sudo apt-get update
    sudo apt-get install -y gnupg

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v5
  with:
    token: ${{ secrets.CODECOV_TOKEN }}
    files: ./coverage/lcov.info
    slug: luvenapps/__APP_NAME__
    flag: quality                         # Optional
    fail_ci_if_error: false
```

### 🧩 Misc

Connect code coverage to a tool lile CodeCov. Generate a token in CodeCov and add it to the repo's Github secrets

Add to your selfhosted workflow and ci-quality.yml after the unit test run with coverage.

```
- name: Install GPG
  run: |
    sudo apt-get update
    sudo apt-get install -y gnupg

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v5
  with:
    token: ${{ secrets.CODECOV_TOKEN }}
    files: ./coverage/lcov.info
    slug: luvenapps/__APP_NAME__
    flag: quality                         # Optional
    fail_ci_if_error: false
```

## 🧭 External References

- [Expo Docs](https://docs.expo.dev)
- [React Native CLI Setup](https://reactnative.dev/docs/environment-setup)
- [Maestro Docs](https://docs.maestro.dev)
- [Testing Library](https://testing-library.com/docs/react-native-testing-library/intro/)
- [ESLint Config Expo](https://docs.expo.dev/guides/using-eslint/)
- [Prettier](https://prettier.io/)
- [CodeCov](https://about.codecov.io/)
- [Supabase Docs](https://supabase.com/docs)
- [Supabase CLI Guide](https://supabase.com/docs/guides/cli)

---

> 💡 Maintained with ❤️ — built for a smooth local-to-production React Native workflow.
