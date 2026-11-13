#!/usr/bin/env sh
# Usage: android_run_e2e.sh <apk_path> <package_name>
set -eu

APK="${1:?apk path required}"
PKG="${2:?package name required}"

ATTEMPTS="${RETRIES:-2}"
DELAY="${RETRY_DELAY:-5}"

# Validate APK exists
[ -f "$APK" ] || { echo "❌ APK not found: $APK"; exit 1; }

INSTALLED=false
i=1
while [ "$i" -le "$ATTEMPTS" ]; do
  echo "🔄 Android E2E attempt $i/$ATTEMPTS..."

  if [ "$INSTALLED" = false ]; then
    echo "📦 Uninstall (if present): $PKG"
    adb uninstall "$PKG" || true

    echo "📥 Install: $APK"
    if ! adb install -r "$APK"; then
      echo "⚠️  Install failed on attempt $i"
      if [ "$i" -lt "$ATTEMPTS" ]; then
        echo "🧹 Cooling down ${DELAY}s before retry..."
        sleep "$DELAY"
        i=$((i + 1))
        continue
      else
        echo "❌ Install failed after $ATTEMPTS attempts"
        exit 1
      fi
    fi
    INSTALLED=true
  fi

  # android-emulator-runner already waits for boot and disables animations.
  adb shell input keyevent 224 || true
  adb shell input keyevent 82 || true

  mkdir -p e2e-artifacts
  OUT="e2e-artifacts/attempt-$i"
  mkdir -p "$OUT"

  # Run tests
  if npm run e2e:android -- --test-output-dir "$OUT"; then
    echo "✅ Passed on attempt $i"
    echo "0" > e2e-artifacts/EXITCODE
    rm -f e2e-artifacts/latest && ln -s "attempt-$i" e2e-artifacts/latest
    exit 0
  fi

  echo "❌ Attempt $i failed"
  if [ "$i" -lt "$ATTEMPTS" ]; then
    echo "🧹 Cooling down ${DELAY}s & stopping app before retry..."
    adb shell am force-stop "$PKG" || true
    # Reset app data between attempts without transferring the APK again.
    adb shell pm clear "$PKG" || INSTALLED=false
    sleep "$DELAY"
  fi

  i=$((i + 1))
done

echo "$ATTEMPTS" > e2e-artifacts/EXITCODE
echo "❌ E2E failed after $ATTEMPTS attempts"
exit 1