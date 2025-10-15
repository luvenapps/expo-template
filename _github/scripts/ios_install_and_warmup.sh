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

  # Final fallback: ask Xcode for TARGET_BUILD_DIR and WRAPPER_NAME to compute the .app path
  if [[ -z "${APP_PATH}" ]]; then
    echo "🔎 Falling back to xcodebuild -showBuildSettings to locate product..."

    # Reconstruct workspace and scheme similar to ios_build.sh (no wildcards passed to xcodebuild)
    find_workspace() {
      find ios -maxdepth 1 -type d -name "*.xcworkspace" -print -quit 2>/dev/null || true
    }
    WORKSPACE_PATH="$(find_workspace)"

    # Derive scheme: prefer first non-Pods/non-Tests scheme
    if command -v jq >/dev/null 2>&1; then
      SCHEME_CANDIDATE="$(xcodebuild -workspace "$WORKSPACE_PATH" -list -json | jq -r '.workspace.schemes[]' | grep -vE '^Pods(-.*)?$|Tests$|UITests$' | head -n1 || true)"
    else
      SCHEME_CANDIDATE="$(xcodebuild -workspace "$WORKSPACE_PATH" -list -json 2>/dev/null \
        | python3 -c 'import sys,json; d=json.load(sys.stdin); schemes=d.get("workspace",{}).get("schemes",[]); [print(s) for s in schemes if not (s.startswith("Pods") or s.endswith("Tests") or s.endswith("UITests"))]' 2>/dev/null \
        | head -n1 || true)"
    fi

    # Compute build dir and wrapper via showBuildSettings for the same configuration used in build
    SHOW_SETTINGS_OUT="$(xcodebuild -workspace "$WORKSPACE_PATH" \
      -scheme "${SCHEME_CANDIDATE}" \
      -configuration "${XCODE_CONFIGURATION:-Release}" \
      -sdk iphonesimulator \
      -derivedDataPath ios/build \
      -showBuildSettings 2>/dev/null || true)"

    TARGET_BUILD_DIR="$(printf '%s' "$SHOW_SETTINGS_OUT" | awk -F' = ' '/TARGET_BUILD_DIR/ {print $2; exit}')"
    WRAPPER_NAME="$(printf '%s' "$SHOW_SETTINGS_OUT" | awk -F' = ' '/WRAPPER_NAME/ {print $2; exit}')"

    if [[ -n "$TARGET_BUILD_DIR" && -n "$WRAPPER_NAME" && -d "$TARGET_BUILD_DIR/$WRAPPER_NAME" ]]; then
      APP_PATH="$TARGET_BUILD_DIR/$WRAPPER_NAME"
    fi
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