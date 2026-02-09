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

---

## 🧪 Runner + timeout policy

### Hosted mode

- Quality: `ubuntu-latest`
- Android hosted: `ubuntu-latest`, timeout `90`
- iOS hosted: `macos-latest`, timeout `90`
- Expo preview hosted: `macos-latest`

### Self-hosted mode

- Quality: `[self-hosted, macos, arm64]`
- Android self-hosted: `[self-hosted, macos, arm64]`, timeout `45`
- iOS self-hosted: `[self-hosted, macos, arm64]`, timeout `45`
- Expo preview self-hosted: `[self-hosted, macos, arm64]`

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

GPG installation is skipped on self-hosted quality runs.

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
