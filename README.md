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

### 📱 3. Platform SDKs

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

### 🧩 3. Homebrew (Package Manager)

If you don’t already have [Homebrew](https://brew.sh/):

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Then run:

```bash
brew update
brew upgrade
```

### 🧭 4. Expo CLI (optional but recommended globally)

You can run Expo commands with `npx`, but installing globally is convenient:

```bash
npm install -g expo-cli
```

Check:

```bash
expo --version
```

### 🧩 5. Core dependencies (via Homebrew)

#### 🕵️‍♂️ Watchman — for fast rebuilds

```bash
brew install watchman
```

#### 🧰 Node.js (latest LTS recommended)

```bash
brew install node
```

### ☕ 6. Java Runtime (for Maestro and Android builds)

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

### 🧪 7. Maestro (E2E Testing)

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

### 🧩 8. Expo Template Install

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

| Action                      | Command               |
| --------------------------- | --------------------- |
| Start Expo dev server       | `npm start`           |
| Run on iOS simulator        | `npm run ios`         |
| Run on Android emulator     | `npm run android`     |
| Run web preview             | `npm run web`         |
| Run Jest tests              | `npm test`            |
| Run Maestro tests (iOS)     | `npm run e2e:ios`     |
| Run Maestro tests (Android) | `npm run e2e:android` |
| Lint code                   | `npm run lint`        |
| Format code                 | `npm run format`      |

---

## 🧭 References

- [Expo Docs](https://docs.expo.dev)
- [React Native CLI Setup](https://reactnative.dev/docs/environment-setup)
- [Maestro Docs](https://docs.maestro.dev)
- [Testing Library](https://testing-library.com/docs/react-native-testing-library/intro/)
- [ESLint Config Expo](https://docs.expo.dev/guides/using-eslint/)
- [Prettier](https://prettier.io/)

---

> 💡 Maintained with ❤️ — built for a smooth local-to-production React Native workflow.
