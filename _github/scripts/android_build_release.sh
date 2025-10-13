#!/usr/bin/env bash

set -euo pipefail

# Ensure non-interactive CI env and proper bundling mode
export CI=1
export NODE_ENV=production
# Ensure Android SDK root is set for Gradle tooling lookup
export ANDROID_SDK_ROOT="${ANDROID_SDK_DIR:-$HOME/Library/Android/sdk}"
# Expand literal "$HOME" if it was passed in env unexpanded
if [[ "$ANDROID_SDK_ROOT" == "\$HOME"* ]]; then
  ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT/\$HOME/$HOME}"
  export ANDROID_SDK_ROOT
fi
if [[ ! -d "$ANDROID_SDK_ROOT" ]]; then
  echo "⚠️ ANDROID_SDK_ROOT does not exist: $ANDROID_SDK_ROOT"
fi

echo "⚙️  Prebuilding native Android (idempotent on CI)…"
# Expo recommends CI=1 instead of --non-interactive
npx expo prebuild -p android --no-install


# Sanity check React Native install (avoid Metro export/main mismatch)
node -e "try{const p=require('react-native/package.json');console.log('react-native:',p.version,' main:',p.main,' exports:',!!p.exports)}catch(e){console.log('react-native not found') }" || true
if [[ ! -f node_modules/react-native/index.js ]]; then
  RN_MAIN=$(node -p "(require('react-native/package.json').main)||''" 2>/dev/null || echo "")
  if [[ "$RN_MAIN" == "index.js" ]]; then
    echo "❌ react-native/package.json points to main=index.js but the file is missing."
    echo "   This usually indicates a corrupted install or version mismatch."
    echo "   Fix locally and in CI: 'rm -rf node_modules package-lock.json && npm ci' or 'npx expo install react-native' to align versions."
    exit 1
  fi
fi

# Guard: ensure RN internal modules resolve (ErrorUtils path changed across RN versions)
if ! node -e "require.resolve('react-native/Libraries/vendor/core/ErrorUtils')" >/dev/null 2>&1; then
  echo "❌ React Native internals not resolvable: 'Libraries/vendor/core/ErrorUtils'."
  echo "   CI is strict: update dependencies locally with 'npx expo install --fix' and commit the lockfile."
  exit 1
fi

echo "🏗️  Building Android release APK…"
pushd android >/dev/null
# Optional: log expo-router version if present (non-fatal)
node -e "try{console.log('expo-router:', require('expo-router/package.json').version)}catch(e){console.log('expo-router not found')}" || true
./gradlew assembleRelease -x lint -x test --build-cache --parallel
popd >/dev/null

APK="android/app/build/outputs/apk/release/app-release.apk"
if [[ -f "$APK" ]]; then
  echo "✅ Built APK: $APK"
else
  echo "❌ APK not found at $APK"
  exit 1
fi