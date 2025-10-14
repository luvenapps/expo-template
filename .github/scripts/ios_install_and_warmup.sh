#!/usr/bin/env bash
set -euo pipefail

# Prefer Release-iphonesimulator (bundled JS); fall back to Debug if not present
APP_PATH=""
for P in \
  ios/build/Build/Products/Release-iphonesimulator \
  ios/build/Build/Products/Debug-iphonesimulator; do
  CANDIDATE="$(find "$P" -maxdepth 2 -type d -name "*.app" | head -n1 || true)"
  if [[ -n "$CANDIDATE" ]]; then APP_PATH="$CANDIDATE"; break; fi
done
if [[ -z "${APP_PATH}" ]]; then
  echo "❌ .app not found in ios/build/Build/Products/{Release,Debug}-iphonesimulator"
  ls -R ios/build/Build/Products || true
  exit 1
fi
echo "📦 Found app at: ${APP_PATH}"

# Install to the currently booted simulator
xcrun simctl install booted "${APP_PATH}"

# Read the bundle identifier
BUNDLE_ID="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "${APP_PATH}/Info.plist")"
echo "🔖 Bundle id: ${BUNDLE_ID}"

# Terminate if already running, then launch fresh and warm-up
xcrun simctl terminate booted "${BUNDLE_ID}" || true
xcrun simctl launch booted "${BUNDLE_ID}"
echo "⏳ Waiting for app to initialize..."
sleep 5