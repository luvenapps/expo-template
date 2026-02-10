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
- `.github/workflows/ci-android-hosted.yml`
- `.github/workflows/ci-android-selfhosted.yml`
- `.github/workflows/ci-ios-hosted.yml`
- `.github/workflows/ci-ios-selfhosted.yml`
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
4. `expo-go-preview` (parallel, no `needs`)

This ensures Android and iOS only run after quality passes, while Expo preview can run independently.

`auto-claude-review.yml` is outside this graph because it is direct PR comment automation.

---

## 🧪 Runner + timeout policy

### Hosted mode

- Quality: `ubuntu-latest`
- Android hosted: `ubuntu-latest`, timeout `90`
- iOS hosted: `macos-latest`, timeout `90`
- Expo preview hosted: `macos-latest`
- Auto Claude review hosted: `ubuntu-latest`

### Self-hosted mode

- Quality: `[self-hosted, macos, arm64]`
- Android self-hosted: `[self-hosted, macos, arm64]`, timeout `45`
- iOS self-hosted: `[self-hosted, macos, arm64]`, timeout `45`
- Expo preview self-hosted: `[self-hosted, macos, arm64]`
- Auto Claude review self-hosted: `[self-hosted, macos, arm64]`

---

## 🔐 Dynamic env/secret mapping in reusable workflows

Reusable workflows accept `env_prefix` and map runtime values dynamically:

- Variables: `vars[format('{0}_VAR_NAME', inputs.env_prefix)]`
- Secrets: selected in shell with `if [ "${{ inputs.env_prefix }}" = "PROD" ] ... else ... fi`

Selected values are written into `$GITHUB_ENV` for downstream steps.

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

`Doctor` is intentionally retained only in `ci-quality.yml`.

GPG installation is skipped on self-hosted quality runs.

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

---

## 👀 Expo Go preview changes

- Removed `Basic checks` (`npm run type-check`) from `.github/workflows/expo-go-preview.yml`.
- Remaining preview publish/comment behavior is unchanged.

---

## 🤖 Auto Claude review workflow

`auto-claude-review.yml` requests Claude review by posting `@claude review this PR`.

- Trigger: `pull_request` with `types: [opened, synchronize]`.
- Hosted mode (`USE_SELF_HOSTED != 'true'`): job runs on `ubuntu-latest`.
- Self-hosted mode (`USE_SELF_HOSTED == 'true'`): job runs on `[self-hosted, macos, arm64]`.
- Required permission: `pull-requests: write`.

---

## 💻 Self-hosted runner baseline

Self-hosted jobs target:

```yaml
runs-on: [self-hosted, macos, arm64]
```

Keep toolchains aligned with project requirements:

- Node version from `.nvmrc`
- Java 17
- Xcode + iOS simulators
- Android SDK + emulator tooling

Runner helper scripts are under `.github/scripts/`.

---

## 🔐 Permissions

Workflows default to minimal permissions:

```yaml
permissions:
  contents: read
```

Increase permissions only where needed at the job level (for example PR comment steps in preview workflows).
