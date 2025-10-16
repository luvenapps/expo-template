#!/usr/bin/env sh
# Usage: android_run_e2e.sh <apk_path> <package_name>
set -eu

APK="${1:?apk path required}"
PKG="${2:?package name required}"

ATTEMPTS="${RETRIES:-2}"
DELAY="${RETRY_DELAY:-5}"

# Validate APK exists
[ -f "$APK" ] || { echo "❌ APK not found: $APK"; exit 1; }

i=1
while [ "$i" -le "$ATTEMPTS" ]; do
  echo "🔄 Android E2E attempt $i/$ATTEMPTS..."

  echo "📦 Uninstall (if present): $PKG"
  adb uninstall "$PKG" || true

  echo "📥 Install: $APK"
  adb install -r "$APK"

  echo "🔌 Wait for device ready"
  j=1
  while [ "$j" -le 60 ]; do
    state="$(adb get-state 2>/dev/null || true)"
    [ "$state" = "device" ] && break
    sleep 1
    j=$((j + 1))
  done
  adb wait-for-device

  # Boot complete & bootanim stopped (with timeouts)
  boot_wait=0
  while [ "$boot_wait" -lt 120 ]; do
    boot_complete="$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || echo "0")"
    [ "$boot_complete" = "1" ] && break
    sleep 2
    boot_wait=$((boot_wait + 2))
  done

  anim_wait=0
  until adb shell getprop init.svc.bootanim 2>/dev/null | grep -q "stopped"; do
    [ "$anim_wait" -ge 120 ] && { echo "⚠️  bootanim did not stop within 120s"; break; }
    sleep 2
    anim_wait=$((anim_wait + 2))
  done

  # 🔓 Wake + unlock with a tiny retry (avoids "Broken pipe (32)")
  k=1
  sleep 2
  while [ "$k" -le 3 ]; do
    adb shell input keyevent 224 >/dev/null 2>&1 || true   # wake
    adb shell input keyevent 82  >/dev/null 2>&1 || true   # unlock/menu
    # optional settle
    sleep 2
    k=$((k + 1))
  done

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
    sleep "$DELAY"
  fi

  i=$((i + 1))
done

echo "$ATTEMPTS" > e2e-artifacts/EXITCODE
echo "❌ E2E failed after $ATTEMPTS attempts"
exit 1