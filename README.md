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

// Database file
const db = openDatabaseSync(DOMAIN.app.database);
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

## ⚙️ Continuous Integration (GitHub Actions)

This project includes a comprehensive GitHub Actions workflow to automate testing, linting, and building for multiple platforms. The CI pipeline runs unit tests with Jest, linting checks with ESLint, and end-to-end tests using Maestro on both iOS and Android environments. It also supports building the app for production to ensure the build process remains stable.

For teams using self-hosted runners, detailed setup instructions are provided to configure macOS and Linux runners with all necessary dependencies installed, including Node.js, Expo CLI, Java (for Maestro), and Android/iOS build tools. Environment variables and secrets are managed securely via GitHub repository settings.

The workflows are designed to trigger on pull requests and pushes to main branches, providing fast feedback on code quality and preventing regressions before merging. This setup enables a smooth and reliable continuous integration process tailored for React Native projects using Expo and Maestro.

For full detailed instructions on configuring the GitHub Actions workflows and setting up self-hosted runners, please see the [Github Actions document](docs/GITHUBACTIONS.md).

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

## 🧭 References

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
