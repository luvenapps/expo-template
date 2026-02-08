# ⚙️ Continuous Integration with GitHub Actions

This project uses split GitHub Actions workflows for **quality checks**, **hosted mobile E2E**, and **self-hosted mobile E2E**.

---

## 🚀 Workflow map

Current workflow files:

- `.github/workflows/ci-quality.yml`
- `.github/workflows/ci-android-hosted.yml`
- `.github/workflows/ci-android-selfhosted.yml`
- `.github/workflows/ci-ios-hosted.yml`
- `.github/workflows/ci-ios-selfhosted.yml`

### Triggers

- **Quality CI** (`ci-quality.yml`)
  - `push`
  - `pull_request`
  - `workflow_dispatch`

- **Android CI - Hosted** (`ci-android-hosted.yml`)
  - `push`
  - `pull_request`
  - `workflow_dispatch`

- **Android CI** (`ci-android-selfhosted.yml`)
  - `workflow_run` (after **Quality CI** completes)
  - `workflow_dispatch`

- **iOS CI - Hosted** (`ci-ios-hosted.yml`)
  - `push`
  - `pull_request`
  - `workflow_dispatch`

- **iOS CI** (`ci-ios-selfhosted.yml`)
  - `workflow_run` (after **Quality CI** completes)
  - `workflow_dispatch`

---

## 🔀 Hosted vs self-hosted routing

Runner mode is controlled by repository variable `USE_SELF_HOSTED`:

- `USE_SELF_HOSTED == 'true'` → self-hosted mobile jobs run
- any other value (including empty) → hosted mobile jobs run

Configure it at:

**Repo → Settings → Secrets and variables → Actions → Variables**

Recommended default:

- `USE_SELF_HOSTED = false`

---

## ✅ Quality CI (`ci-quality.yml`)

Quality checks are centralized here (instead of duplicated in mobile workflows):

- formatting (`npm run format:check`)
- lint (`npm run lint`)
- unit tests with coverage (`npm run test -- --coverage`)
- Codecov uploads

It contains two jobs:

- `quality-hosted` (Ubuntu, hosted mode)
- `quality-selfhosted` (self-hosted macOS arm64)

Codecov flags are split for clarity:

- `hosted-quality`
- `selfhosted-quality`

---

## 🤖 Android workflows

### Hosted (`ci-android-hosted.yml`)

- Job: `android-hosted`
- Runner: `ubuntu-latest`
- Timeout: `90` minutes
- Performs build + Android E2E flow

### Self-hosted (`ci-android-selfhosted.yml`)

- Workflow name: **Android CI**
- Job: `android-selfhosted`
- Runner: `[self-hosted, macos, arm64]`
- Timeout: `45` minutes
- Triggered automatically after successful **Quality CI** via `workflow_run`
- Also manually runnable via `workflow_dispatch`

---

## 🍎 iOS workflows

### Hosted (`ci-ios-hosted.yml`)

- Job: `ios-hosted`
- Runner: `macos-latest`
- Timeout: `90` minutes
- Performs build + iOS E2E flow

### Self-hosted (`ci-ios-selfhosted.yml`)

- Workflow name: **iOS CI**
- Job: `ios-selfhosted`
- Runner: `[self-hosted, macos, arm64]`
- Timeout: `45` minutes
- Triggered automatically after successful **Quality CI** via `workflow_run`
- Also manually runnable via `workflow_dispatch`

---

## 🧩 Action versions and runtime consistency

Workflows use:

- `actions/checkout@v5`
- `actions/setup-node@v6` with `node-version-file: '.nvmrc'`
- `actions/setup-java@v5` (where Java is required)

This keeps CI aligned with repository Node pinning and current stable GitHub Action majors.

---

## 💻 Self-hosted macOS runner notes

Self-hosted jobs target:

```yaml
runs-on: [self-hosted, macos, arm64]
```

Keep runner toolchains aligned with project requirements:

- Node (from `.nvmrc`)
- Java 17
- Xcode + iOS simulator tooling
- Android SDK + emulator tooling (for Android self-hosted)

Runner helper scripts are in `.github/runner/`.

---

## 🔐 Permissions

Workflows set minimal default token permissions:

```yaml
permissions:
  contents: read
```

Increase permissions only at job level when required.
