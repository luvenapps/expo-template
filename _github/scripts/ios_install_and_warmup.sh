#!/usr/bin/env bash
set -euo pipefail


# Try to locate the built .app in common output folders first
APP_PATH=""
for P in \
  ios/build/Build/Products/Release-iphonesimulator \
  ios/build/Build/Products/Debug-iphonesimulator; do
  CANDIDATE="$(find "$P" -maxdepth 2 -type d -name "*.app" 2>/dev/null | head -n1 || true)"
  if [[ -n "$CANDIDATE" ]]; then APP_PATH="$CANDIDATE"; break; fi
done

# Fallback: search anywhere under ios/build (covers custom configs like ReleaseDevelopment-iphonesimulator)
if [[ -z "${APP_PATH}" ]]; then
  CANDIDATE="$(find ios/build -type d -name "*.app" -path "*/Build/Products/*-iphonesimulator/*.app" 2>/dev/null | head -n1 || true)"
  if [[ -n "$CANDIDATE" ]]; then APP_PATH="$CANDIDATE"; fi
fi

# Fallback: search in Xcode DerivedData if -derivedDataPath wasn't used
if [[ -z "${APP_PATH}" ]]; then
  DERIVED_BASE="${DERIVED_DATA_PATH:-$HOME/Library/Developer/Xcode/DerivedData}"
  CANDIDATE="$(find "$DERIVED_BASE" -type d -name "*.app" -path "*/Build/Products/*-iphonesimulator/*.app" 2>/dev/null | head -n1 || true)"
  if [[ -n "$CANDIDATE" ]]; then APP_PATH="$CANDIDATE"; fi
fi

if [[ -z "${APP_PATH}" ]]; then
  echo "❌ .app not found in expected locations."
  echo "Searched:"
  echo "  - ios/build/Build/Products/Release-iphonesimulator"
  echo "  - ios/build/Build/Products/Debug-iphonesimulator"
  echo "  - ios/build/**/Build/Products/*-iphonesimulator/*.app"
  echo "  - ${DERIVED_BASE:-$HOME/Library/Developer/Xcode/DerivedData}/**/Build/Products/*-iphonesimulator/*.app"
  echo "\n📂 Listing ios/build/Build/Products for debugging:"
  ls -R ios/build/Build/Products 2>/dev/null || true
  echo "\n💡 Tip: ensure the iOS build step succeeded and used '-derivedDataPath ios/build' (as in ios_build.sh)."
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