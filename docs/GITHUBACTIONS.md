# ⚙️ Continuous Integration with GitHub Actions

This project is CI/CD-ready for **Expo React Native** apps. It runs linting, unit tests, and E2E (Maestro) tests for both **Android** and **iOS** using GitHub Actions.

---

## 🚀 Overview

There are two separate workflows:

- **Android CI**
- **iOS CI**

Each workflow can run on **GitHub-hosted** or **self-hosted** runners. The mode is controlled by a **repository variable** `USE_SELF_HOSTED`:

- `USE_SELF_HOSTED == 'true'` → run **self-hosted** jobs only
- any other value (including empty) → run **hosted** jobs only

### 🔀 Configure the runner mode (one-time)

1. Go to **Repo → Settings → Secrets and variables → Actions → Variables → Repository variables**
2. Click **New repository variable**
3. **Name:** `USE_SELF_HOSTED`  
   **Value:** `false` (hosted-by-default). Set to `true` when you want to route jobs to your Mac.
4. Save. You can flip this at any time without committing changes.

---

## 📦 What the workflows do

### Android (`ci-android.yml`)

Jobs:

- **`android-quality-hosted`** on `ubuntu-latest` (format/lint/tests) — runs only when hosted mode is selected
- **`android-hosted`** on `macos-latest` (build + E2E) — runs only when hosted mode is selected
- **`android-selfhosted`** on your **M1 Mac** (build + E2E) — runs only when `USE_SELF_HOSTED == 'true'`

Only one path (hosted _or_ self-hosted) runs per workflow execution.

Each job:

1. Checkout repo
2. Setup **Java 17** (required for Maestro) and **Node 24.1.0**
3. `npm ci`
4. Cache **Gradle** (`~/.gradle/caches`)
5. Run **format check**, **ESLint**, **Jest**, **expo-doctor**
6. Build release APK with `expo prebuild -p android` and `./gradlew assembleRelease`
7. Start an **Android emulator** (Pixel 8, API 35, arm64-v8a)
8. Install APK, launch app for warmup
9. Install **Maestro CLI** and run `maestro test .maestro/flows/smoke.android.yaml`
10. Upload artifacts on failure

### iOS (`ci-ios.yml`)

Jobs:

- **`ios-quality-hosted`** on `ubuntu-latest` (format/lint/tests) — runs only when hosted mode is selected
- **`ios-hosted`** on `macos-latest` (build + E2E) — runs only when hosted mode is selected
- **`ios-selfhosted`** on your **M1 Mac** (build + E2E) — runs only when `USE_SELF_HOSTED == 'true'`

Only one path (hosted _or_ self-hosted) runs per workflow execution.

Each job:

1. Checkout
2. Setup **Java 17** (required for Maestro) and **Node 24.1.0**
3. `npm ci`
4. Cache **CocoaPods** (`ios/Pods`) and **Xcode DerivedData**
5. Run **format check**, **ESLint**, **Jest**, **expo-doctor**
6. Ensure an **iPhone 17** simulator exists and is **booted** (falls back to iPhone 16 if unavailable)
7. Build with `expo prebuild -p ios` and `xcodebuild` for simulator
8. Install app on simulator and launch for warmup
9. Install **Maestro CLI** and run `maestro test .maestro/flows/smoke.ios.yaml`
10. Upload artifacts on failure

---

## 🧰 Prerequisites in package.json

Make sure your project defines these scripts (examples):

```jsonc
{
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "web": "expo start --web",
    "test": "jest",
    "lint": "eslint . --ext .js,.jsx,.ts,.tsx",
    "format:check": "prettier --check .",
    "doctor": "expo-doctor --verbose",
    "e2e:ios": "maestro test .maestro/flows/smoke.ios.yaml",
    "e2e:android": "maestro test .maestro/flows/smoke.android.yaml",
  },
}
```

---

## 💻 Self‑Hosted macOS Runner — Setup Guide

### 1) Prepare your Mac (one-time)

Follow the environment setup steps in the main [README.md](./README.md#️-prerequisites) to ensure all dependencies (Node, Java, Watchman, Xcode, Android SDK, etc.) are installed.

Once complete, return here to register and run the self-hosted runner.

> Tip: the local runner stores all runtime files under `.github/runner/_/`, which is ignored by Git.

### 2) Register the runner in GitHub

#### 🏢 Organization-Level Setup (Recommended)

- Go to **Organization → Settings → Actions → Runner groups → New Runner Group**, fill it and **Create group**
- Choose **New runner → New self-hosted runner → macOS → arm64**
- Use the **same registration process** as above (it will auto-detect the org repo)
- Confirm organization-level workflow permissions
- Verify runner appears under org-level runners list and is **Idle**

#### 🧩 Repository-Level Setup

- Go to **Repo → Settings → Actions → Runners → New self-hosted runner**
- Choose **macOS** and **arm64**
- Copy the **registration token** for use when configuring the runner
- Confirm under **Settings → Actions → General**:
  - "Allow all actions and reusable workflows"
  - "Workflow permissions → Read and write"
- (Optional) Add **Secrets** via **Settings → Secrets and variables → Actions**
- Verify runner status as "Idle" in the Runners list

#### 🧠 Runner Groups Best Practices

Runner groups let you organize and control access to your self‑hosted runners across multiple repositories.

- Create an organization‑level **runner group**, e.g. `expo-ci`.
- Under **Repository access**, choose **Selected repositories** and add only your private repos (not `expo-template`).
- Keep runner labels consistent, e.g. `self-hosted, macos, arm64`.
- In workflow files, continue using:
  ```yaml
  runs-on: [self-hosted, macos, arm64]
  ```
- If builds begin queuing, add additional runners to the same group to enable parallel jobs.

##### ⚙️ Notes

- Runner groups **control access**, runners **execute jobs**.
- Jobs from different repos will run independently but will **queue** if only one runner is available.
- Each additional runner added to the group increases total concurrency.
- Maintain environment parity (Node, Xcode, Android SDK versions) across all runners in a group.
- Each runner should use its own isolated workspace directory to avoid conflicts.

### 3) Register the runner with isolated workspace

Run `.github/runner/register-runner.sh` **from within your repository**. The script will automatically detect the repository and assign a default runner name and labels (`self-hosted,macos,arm64`).

This ensures all build artifacts stay in `.github/runner/_/workspace/` instead of polluting your system directories.

---

### 4) Start the runner

- For a development Mac, start the runner **only when you need it**:

```bash
# whenever you need to accept jobs
.github/runner/runner.local.sh
```

The script automatically sets up isolated environment variables to keep all build artifacts contained.

Keep that terminal open; the runner will accept jobs while it's running.  
You can stop it with **Ctrl+C** at any time.

The runner will appear as **Idle** in: Settings → Actions → Runners when it's ready.

- For a dedicated CI machine, start the runner **as a background service**:

You can manage the self-hosted GitHub Actions runner as a background service using the provided `.github/runner/runner-service.sh` script. This script allows you to easily start or stop the runner service without manually interacting with `launchd` or the runner binaries.

```bash
# Start the runner background service
.github/runner/runner-service.sh start

# Stop the runner background service
.github/runner/runner-service.sh stop
```

The script will automatically detect whether the service is already running or stopped to avoid redundant operations.

The runner will appear as Idle in: Settings → Actions → Runners when it's ready.

### 5) Clean up build artifacts

When you want to reclaim disk space:

```bash
# Delete all build artifacts
.github/runner/cleanup.sh
```

This removes everything in `.github/runner/_/workspace/` but keeps your runner registration intact.

> **Tip:** The cleanup script supports an interactive text menu to choose what to clean up.

## 🧪 Maestro Notes

- The workflows install Maestro CLI on-demand.
- Your flows live in `.maestro/flows/` and reference your `appId`/`package` from `app.json`.
- Both iOS and Android workflows include app warmup before E2E tests for improved reliability.

---

## 🔐 Secrets / Security

- For simulator builds, you don't need signing.
- For device/App Store builds, you'll need to import certificates/profiles into the Keychain of the runner user.

---

## 📊 Workflow Improvements

Recent improvements to the CI workflows:

- **Simplified E2E timeout handling** on iOS using native `timeout` command
- **App warmup steps** on both platforms to improve test reliability
- **Unique artifact names** per job to avoid collisions during debugging
- **Explicit cache saves** on Android to preserve partial cache on failure
- **Isolated workspace** for self-hosted runners to keep your system clean

## 🔒 Minimal token permissions

The workflows set `permissions: { contents: read }` at the top to follow least-privilege for the auto-generated `GITHUB_TOKEN`. Increase permissions at the **job** level only if you need to publish releases, comment on PRs, etc.
