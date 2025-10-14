#!/usr/bin/env bash
set -euo pipefail

# Shutdown running Android emulators on exit unless KEEP_ANDROID_EMULATOR is true
shutdown_android_emulators() {
  if command -v adb >/dev/null 2>&1; then
    EMUS=$(adb devices | awk '/^emulator-/{print $1}')
    if [[ -n "$EMUS" ]]; then
      echo "🛑 Shutting down Android emulators: $EMUS"
      for dev in $EMUS; do
        adb -s "$dev" emu kill || true
      done
      # Give the emulator service a moment to settle
      sleep 2 || true
    fi
  fi
}

cleanup() {
  if [[ ! ${KEEP_ANDROID_EMULATOR:-} =~ ^(1|true|yes)$ ]]; then
    shutdown_android_emulators
  else
    echo "ℹ️  KEEP_ANDROID_EMULATOR set; leaving emulators running"
  fi
}
trap cleanup EXIT

APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
FLOW_PATH=".maestro/flows/smoke.android.yaml"
ARTIFACT_DIR="e2e-artifacts"

echo "🔎 adb devices"
adb devices

echo "📦 Installing APK: $APK_PATH"
adb install -r -d "$APK_PATH"

# Locate aapt (PATH, ANDROID_SDK_ROOT, ANDROID_HOME)
find_aapt() {
  if command -v aapt >/dev/null 2>&1; then
    command -v aapt
    return 0
  fi
  local roots=()
  [[ -n "${ANDROID_SDK_ROOT:-}" ]] && roots+=("$ANDROID_SDK_ROOT")
  [[ -n "${ANDROID_HOME:-}" ]] && roots+=("$ANDROID_HOME")
  roots+=("$HOME/Library/Android/sdk" "/usr/local/share/android-sdk" "/usr/local/opt/android-sdk")
  for r in "${roots[@]}"; do
    if [[ -d "$r/build-tools" ]]; then
      local cand
      cand="$(ls -1d "$r"/build-tools/* 2>/dev/null | sort -V | tail -n1)/aapt"
      if [[ -x "$cand" ]]; then
        echo "$cand"
        return 0
      fi
    fi
  done
  return 1
}

PKG=""
if AAPT_BIN="$(find_aapt)"; then
  echo "🧰 Using aapt at: $AAPT_BIN"
  PKG="$("$AAPT_BIN" dump badging "$APK_PATH" | awk -F\" '/package: name=/{print $2; exit}')"
fi

if [[ -n "$PKG" ]]; then
  echo "🚀 Warmup launch for package: $PKG"
  adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 || true
  sleep 5
else
  echo "⚠️  Could not determine package name from APK; skipping warmup"
fi

echo "🧪 Running Maestro E2E: $FLOW_PATH"
mkdir -p "$ARTIFACT_DIR"
maestro --version
maestro test "$FLOW_PATH" --test-output-dir "$ARTIFACT_DIR"
echo "✅ Maestro tests completed"