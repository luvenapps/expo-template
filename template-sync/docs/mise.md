# Using mise for local development

This repository includes first-class `mise` support via the root `.mise.toml` and treats mise as the default setup path.

## Quickstart (default)

1. Bootstrap with the repo helper script:

   ```bash
   npm run setup:local
   ```

   This installs missing Homebrew core dependencies (`mise`, `fastlane`, `watchman`), then runs `mise trust` and `mise install`.

2. Verify tool versions:

   ```bash
   mise ls
   node -v
   npm -v
   java -version
   ```

3. Install dependencies:

   ```bash
   npm ci
   ```

## Manual setup (equivalent)

```bash
brew install mise
mise trust
mise install
mise ls
node -v
npm -v
java -version
npm ci
```

## JAVA_HOME and shell profile notes

With mise shell activation configured, Java from `.mise.toml` is used in the activated shell, so manual `JAVA_HOME` exports are generally unnecessary.

If you have not enabled shell activation yet, follow the official mise shell activation docs for your shell.

## Using mise in CI

CI workflows should install and run tools via mise so `.mise.toml` remains the single source of truth for Node/Java pins.

Example pattern:

```yaml
- name: Prepare isolated GnuPG home for mise
  run: |
    mkdir -p "${RUNNER_TEMP}/gnupg"
    chmod 700 "${RUNNER_TEMP}/gnupg"
- uses: jdx/mise-action@v3
  with:
    install: true
    log_level: ${{ runner.debug == '1' && 'debug' || 'info' }}
  env:
    GNUPGHOME: ${{ runner.temp }}/gnupg
    MISE_TRUSTED_CONFIG_PATHS: ${{ github.workspace }}
- run: |
    mise exec -- node -v
    mise exec -- npm ci
```

## Java version notation

You can use either a generic major-version pin or a vendor-pinned entry, depending on your reproducibility needs.

- A generic pin lets mise choose a Java distribution based on plugin defaults/platform availability.
- A vendor-pinned entry pins both the major version and vendor explicitly.

This repo currently uses a vendor-pinned Java entry in `.mise.toml` to keep Java runtime behavior consistent across local and CI environments.
To inspect what mise resolved locally, run:

```bash
mise ls
```

If your team prefers a looser pin later, switch to a generic major-version Java pin.

## Important compatibility note

- App and CI workflows in this repo still use `npm` + `package-lock.json` as the source of truth.
- Use `npm ci` (or `npm install` for local mutation) to match the existing scripts and CI behavior.

## System prerequisites remain required

`mise` manages runtime versions, but it does **not** replace platform/system dependencies. You still need:

- Xcode + Command Line Tools (iOS)
- Android Studio + Android SDK/platform-tools (Android)
- A container runtime (Rancher Desktop/Docker Desktop/Colima) for Supabase local
- Maestro CLI for E2E workflows

## What about fastlane, watchman, maestro, and supabase?

- **fastlane**: not managed by this repo's `.mise.toml`; install via Homebrew/Gem for native build/release flows.
- **watchman**: not managed by this repo's `.mise.toml`; install via Homebrew for faster Metro file watching.
- **maestro**: not managed by this repo's `.mise.toml`; install the Maestro CLI separately (Java runtime itself is pinned via mise).
- **supabase**: Supabase CLI is provided by repo dev dependencies (`npx supabase ...` / npm scripts), but local Supabase still requires a running container runtime.
