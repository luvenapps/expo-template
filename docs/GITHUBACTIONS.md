# ⚙️ Continuous Integration with GitHub Actions

This repository uses **coordinator workflows + reusable workflows**.

- Coordinators are the only workflows triggered by PR/push.
- Sub-workflows run through `workflow_call`.
- Hosted vs self-hosted execution is controlled by `USE_SELF_HOSTED`.

---

## 🚀 Workflow map

### Coordinator workflows (event entry points)

- `.github/workflows/ci-hosted-coordinator.yml`
- `.github/workflows/ci-selfhosted-coordinator.yml`

Both coordinators trigger on:

- `push` to `main` (with `paths-ignore`)
- `pull_request` with `types: [opened, synchronize, reopened]` (with `paths-ignore`)

Both coordinators define:

- `run-name: ${{ github.event.workflow_run.display_title || github.ref_name }}`
- `env.ENV_PREFIX`: `PROD` for `main`, otherwise `DEV`

### Reusable sub-workflows (`workflow_call`)

- `.github/workflows/ci-quality.yml`
- `.github/workflows/ci-cache-bust.yml`
- `.github/workflows/ci-android-hosted.yml`
- `.github/workflows/ci-android-selfhosted.yml`
- `.github/workflows/ci-ios-hosted.yml`
- `.github/workflows/ci-ios-selfhosted.yml`
- `.github/workflows/web-deploy.yml`
- `.github/workflows/expo-go-preview.yml`

All of the above are called by coordinators via `uses: ./.github/workflows/...` and `secrets: inherit`.

### Standalone PR automation workflow

- `.github/workflows/auto-claude-review.yml`

This workflow is intentionally separate from the coordinator/reusable graph and runs directly on PR events.

---

## 🔀 Hosted vs self-hosted routing

Routing is controlled by repository variable `USE_SELF_HOSTED`:

- `USE_SELF_HOSTED == 'true'`
  - self-hosted coordinator jobs run
  - hosted coordinator jobs are skipped
- any other value (including empty)
  - hosted coordinator jobs run
  - self-hosted coordinator jobs are skipped

Configure at:

**Repo → Settings → Secrets and variables → Actions → Variables**

---

## 🧱 Coordinator job graph

Each coordinator runs the same dependency graph:

1. `quality`
2. `android` (`needs: quality`)
3. `ios` (`needs: quality`)
4. `web-deploy` (`needs: quality`)
5. `expo-go-preview` (parallel, no `needs`)

The self-hosted coordinator adds two additional jobs:

- `cache-bust` (parallel with `quality`, no `needs`) — wipes the local cache when `CACHE_BUST_TOKEN` changes; `android`, `ios`, and `web-deploy` all `needs: [quality, cache-bust]`. See [Cache busting](#cache-busting).
- `evict-local-cache` (`needs: [android, ios, web-deploy]`, `if: always()`) — only runs when `USE_LOCAL_CACHE == 'true'`; see [LRU eviction](#lru-eviction).

Ordering summary:

- Hosted: `quality` gates `android`, `ios`, and `web-deploy`; `expo-go-preview` runs independently.
- Self-hosted: `quality` and `cache-bust` gate `android`, `ios`, and `web-deploy`; `expo-go-preview` runs independently.
- Self-hosted eviction waits for `android`, `ios`, and `web-deploy` so cache cleanup starts after all build/deploy jobs complete.

`auto-claude-review.yml` is outside this graph because it is direct PR comment automation.

---

## 🧪 Runner + timeout policy

### Hosted mode

- Quality: `ubuntu-latest`
- Android hosted: `ubuntu-latest`, timeout `90`
- iOS hosted: `macos-latest`, timeout `90`
- Web deploy hosted: `macos-latest`
- Expo preview hosted: `macos-latest`
- Auto Claude review hosted: `ubuntu-latest`

### Self-hosted mode

- Quality: `[self-hosted, macos, arm64]`
- Android self-hosted: `[self-hosted, macos, arm64]`, timeout `45`
- iOS self-hosted: `[self-hosted, macos, arm64]`, timeout `45`
- Web deploy self-hosted: `[self-hosted, macos, arm64]`
- Expo preview self-hosted: `[self-hosted, macos, arm64]`
- Auto Claude review self-hosted: `[self-hosted, macos, arm64]`

Runner policy for web deploy:

- Web deploy follows coordinator routing (`USE_SELF_HOSTED`) and receives `runner_target` from the coordinator.
- Hosted mode uses GitHub-hosted macOS runners; self-hosted mode uses `[self-hosted, macos, arm64]` and performs workspace cleanup/reset before running.

---

## 🌐 Web deploy workflow behavior

`web-deploy.yml` is a reusable workflow invoked by both coordinators.

- PR events: deploys preview builds with an EAS alias `pr-<number>`.
- Pushes to `main`: deploys production builds with `--prod`.
- Fork PR safety: deployment is skipped when the PR head repository is a fork.
- PR comment behavior: bot comments use the title `Web Preview` and only include the preview URL (the alias URL when available, e.g. `pr-123`).

---

## 🔐 Dynamic env/secret mapping in reusable workflows

Reusable workflows accept `env_prefix` and map runtime values dynamically:

- Variables: `vars[format('{0}_VAR_NAME', inputs.env_prefix)]`
- Secrets: selected in shell with `if [ "${{ inputs.env_prefix }}" = "PROD" ] ... else ... fi`

Selected values are written into `$GITHUB_ENV` for downstream steps.

The mapping is performed by `.github/scripts/map_runtime_env.sh` which is called early in every mobile workflow.

---

## 🔧 Quality workflow

`ci-quality.yml` is reusable and receives:

- `env_prefix`
- `runner_target` (`hosted` or `selfhosted`)

It runs:

- `npm run format:check`
- `npm run lint`
- `npm run test -- --coverage`
- Codecov uploads
- Expo dependency verification via `.github/scripts/verify_expo_deps.sh`

`Doctor` is intentionally retained only in `ci-quality.yml`.

GPG installation is skipped on self-hosted quality runs.

**Expo dep check is centralised here.** It was previously duplicated in each mobile workflow; it now runs once in quality and mobile workflows no longer call `verify_expo_deps.sh` directly.

---

## 📦 Native build cache repack behavior (Android + iOS)

To speed E2E while still testing the latest PR JavaScript, Android and iOS workflows repack cached native artifacts.

### Repack trigger conditions

- Repack runs **only** when the platform cache is a hit.
- On cache miss, workflows perform a full native rebuild and skip repack.

### iOS placement and source of truth

- Repack step is immediately after **Locate .app artifact**.
- The located `find_app` output path is used as `--source-app`.
- Repack tool output is written to a temp path, then explicitly moved back to the located path (`find_app`) so downstream E2E steps continue using the same path.

### Android placement and source of truth

- Repack step is immediately after **Save APK to cache**.
- The located `find_apk` output path is used as `--source-app`.
- Repack writes directly to the located path via `--output`, so downstream E2E steps continue using the locate step output.

### Repack commands

Both platforms follow the same pattern and use `npx` only:

```bash
npx @expo/repack-app --platform android --source-app <located-apk-path> --output <located-apk-path>
npx @expo/repack-app --platform ios --source-app <located-app-path> --output <temp-path>
# then replace the located .app path with the repacked output
```

### Hermes bundle validation

Before repack, `.github/scripts/validate_hermes_bundle.sh <platform>` checks that the cached native binary and the freshly-exported JS bundle are Hermes-compatible (accepts both `.js` and `.hbc` bytecode outputs). If validation fails the workflow aborts before touching the artifact.

---

## 💾 Local disk cache (self-hosted only)

GitHub Actions imposes a 10 GB org-wide cache quota. Because Renovate triggers the self-hosted workflow on every dependency update, the quota fills quickly. The local cache system routes cache I/O to the runner's own SSD instead of the GitHub cache service.

### Enabling

Set a repository (or org) variable:

```
USE_LOCAL_CACHE = true
```

Remove it or set it to any other value to fall back to `actions/cache` with no code change required.

### Composite actions

Two composite actions in `.github/actions/local-cache/` wrap every cache step:

| Action                | Replaces                                                    |
| --------------------- | ----------------------------------------------------------- |
| `local-cache/restore` | `actions/cache/restore@v5`                                  |
| `local-cache/save`    | `actions/cache/save@v5` and the combined `actions/cache@v5` |

Both actions accept a `use-local-cache` input. When `false` (or unset) they delegate directly to the corresponding `actions/cache` action, so hosted workflows are completely unaffected.

### Storage layout

Cache entries are stored in the runner's home directory:

```
~/.github/local-ci-cache/
├── .lockdir/             ← advisory mutex directory (held during save/restore/evict)
└── <sanitized-key>/
    ├── cache.tar.gz      ← tar archive preserving absolute paths
    ├── .saved-at         ← Unix epoch written on save
    └── .last-accessed    ← Unix epoch updated on every restore hit
```

`cache.tar.gz` is extracted with `tar -xzf ... -C /`, which restores files to their original absolute paths (`~/.gradle/caches`, `$GITHUB_WORKSPACE/*.apk`, etc.).

Why not inside the workspace? The Android workflow runs `git clean -ffdx` at the start of every job. The `-x` flag removes gitignored files, so anything inside the workspace — even under `.gitignore` — is deleted before the restore step runs. `~` is outside the workspace and is never touched by `git clean`.

### What is cached

| Cache key                              | Contents                                                   | Workflow                    |
| -------------------------------------- | ---------------------------------------------------------- | --------------------------- |
| `android-<repo>-apk-<fingerprint>-...` | `*.apk` in workspace root                                  | `ci-android-selfhosted.yml` |
| `gradle-<OS>-<repo>-<hash>`            | `~/.gradle/caches`, `~/.gradle/wrapper`, `android/.gradle` | `ci-android-selfhosted.yml` |
| `ios-<repo>-app-<fingerprint>-...`     | `*.tar.gz` in workspace root                               | `ci-ios-selfhosted.yml`     |

### Concurrency and locking

Save, restore, and eviction all acquire an exclusive advisory lock before touching cache entries. The lock is implemented as `~/.github/local-ci-cache/.lockdir` — `mkdir` on that path is atomic on all POSIX filesystems (Linux and macOS) and requires no external packages. The lock is released automatically via a bash `EXIT` trap. Stale locks older than 3 minutes (left by force-killed jobs) are cleared automatically.

The `evict-local-cache` job also carries a GitHub Actions job-level `concurrency` group (`local-cache-evict`, `cancel-in-progress: false`) so that evictions from concurrent workflow runs are serialized rather than overlapping.

### Cache busting

To force-wipe the entire local cache on all self-hosted runners (e.g. after a corrupted entry or a major toolchain upgrade), rotate the value of a repository variable:

```
CACHE_BUST_TOKEN = <any new value>
```

The `cache-bust` job in `ci-selfhosted-coordinator.yml` (reusable workflow: `ci-cache-bust.yml`) reads `~/.github/local-ci-cache/.bust-token` and compares it to `vars.CACHE_BUST_TOKEN`. If they differ, the entire `~/.github/local-ci-cache/` directory is wiped and the new token is written to disk. On subsequent runs the token matches and the wipe is skipped.

`android` and `ios` both `needs: [quality, cache-bust]`, so builds cannot start until the wipe completes.

### LRU eviction

The `evict-local-cache` job in `ci-selfhosted-coordinator.yml` runs after `android` and `ios` complete (regardless of their outcome). It:

1. Measures total size of `~/.github/local-ci-cache/`.
2. If over the configured limit (default **100 GB**), deletes entries in least-recently-accessed order until the total is back under budget.
3. LRU order is determined by `.last-accessed` (updated on restore hit), falling back to `.saved-at`, then directory mtime.

The limit defaults to 100 GB and can be overridden by setting a repository (or org) variable:

```
LOCAL_CACHE_MAX_GB = 50
```

### Variable timing

`vars.*` values (including `CACHE_BUST_TOKEN` and `LOCAL_CACHE_MAX_GB`) are resolved at **workflow run creation time** — when the triggering event (push, PR) fires — not when individual jobs start. If you update a variable while a run is already in progress, the running jobs will still see the old value. The new value takes effect on the next workflow run triggered after the update.

---

## 👀 Expo Go preview changes

- The PR comment now embeds a **scannable QR code** from `qr.expo.dev` linking to the published update.
- The update group ID and runtime version are parsed from the `eas update --json` output.
- Falls back to the original plain-text comment if JSON parsing fails.
- `Basic checks` (`npm run type-check`) was removed from `expo-go-preview.yml`; type checking now runs in `ci-quality.yml`.

---

## 🔥 Firebase guardrails (self-hosted mobile jobs)

Android and iOS self-hosted workflows gate Firebase-dependent steps behind a `TURN_ON_FIREBASE` variable:

- `vars.TURN_ON_FIREBASE == 'true'` (or `vars.<PREFIX>_TURN_ON_FIREBASE == 'true'`) — Firebase secrets are injected.
- Any other value — Firebase env vars are set to empty strings so the app still builds and runs without Firebase.

The same pattern is applied in `expo-go-preview.yml`.

---

## 📜 Shared CI scripts

All helper scripts live under `.github/scripts/` and are made executable via `chmod +x .github/scripts/*.sh` early in each workflow.

| Script                          | Purpose                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------- |
| `map_runtime_env.sh`            | Maps `env_prefix`-scoped vars/secrets into `$GITHUB_ENV`                        |
| `validate_hermes_bundle.sh`     | Verifies Hermes compatibility between native binary and JS bundle before repack |
| `verify_expo_deps.sh`           | Checks that installed Expo package versions match `expo-doctor` expectations    |
| `compute_fingerprint.sh`        | Computes a deterministic cache key for the native build (Android or iOS)        |
| `setup_fastlane.sh`             | Installs/verifies the pinned Fastlane version                                   |
| `setup_maestro.sh`              | Installs/verifies the pinned Maestro version                                    |
| `android_run_e2e.sh`            | Runs the Android E2E test suite via Maestro                                     |
| `ios_boot_simulator.sh`         | Boots the target iOS simulator                                                  |
| `ios_install_app.sh`            | Installs the `.app` on the booted simulator                                     |
| `ios_run_e2e.sh`                | Runs the iOS E2E test suite via Maestro                                         |
| `clean_selfhosted_workspace.sh` | Post-job workspace cleanup on self-hosted runners                               |

---

## 🤖 Auto Claude review workflow

`auto-claude-review.yml` requests Claude review by posting `@claude review this PR`.

- Trigger: `pull_request` with `types: [opened, synchronize]`.
- Hosted mode (`USE_SELF_HOSTED != 'true'`): job runs on `ubuntu-latest`.
- Self-hosted mode (`USE_SELF_HOSTED == 'true'`): job runs on `[self-hosted, macos, arm64]`.
- Required permission: `pull-requests: write`.

---

## 🔄 Renovate

`renovate.json` is present at the repository root. Renovate runs as a self-hosted workflow, which means every Renovate dependency-update PR triggers the full self-hosted CI pipeline. This is the primary driver for the local disk cache feature — Renovate PRs previously consumed the 10 GB GitHub cache quota faster than it could be reclaimed.

---

## 💻 Self-hosted runner baseline

Self-hosted jobs target:

```yaml
runs-on: [self-hosted, macos, arm64]
```

Keep toolchains aligned with project requirements:

- Node version from `.mise.toml`
- Java (pinned in `.mise.toml`)
- Xcode + iOS simulators
- Android SDK + emulator tooling

Runner install location (macOS-safe):

```
~/.github/actions-runner
```

Runner workspace location:

```
~/.github/actions-runner-workspace
```

Runner helper scripts:

| Script                               | Purpose                                                                       |
| ------------------------------------ | ----------------------------------------------------------------------------- |
| `.github/runner/register-runner.sh`  | Download/configure runner (prompts for token + scope), does not start service |
| `.github/runner/runner.service.sh`   | Manage launchd service: `start`, `stop`, `restart`, `status`, `logs`          |
| `.github/runner/runner.local.sh`     | Run runner manually in foreground (non-service)                               |
| `.github/runner/uninstall-runner.sh` | Unregister runner (remove token) and optionally remove local files            |
| `.github/runner/cleanup.sh`          | Clean runner workspace only (`~/.github/actions-runner-workspace`)            |

Notes:

- `runner.service.sh logs` now follows live output (`tail -F`) for the active runner label only.
- `runner.service.sh start` installs the service if missing, then starts it.
- `cleanup.sh` no longer supports full cleanup; use `uninstall-runner.sh` for unregister/removal.

---

## 🔐 Permissions

Workflows default to minimal permissions:

```yaml
permissions:
  contents: read
```

Increase permissions only where needed at the job level (for example PR comment steps in preview workflows).
