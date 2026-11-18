#!/usr/bin/env bash
set -euo pipefail

# Validates that the JS bundle in dist/ matches the expected JS engine from Expo config.
# Usage: validate_hermes_bundle.sh <PLATFORM>
#   PLATFORM: "ios" or "android"

PLATFORM="${1:?Usage: validate_hermes_bundle.sh <PLATFORM>}"

EXPO_CONFIG_JSON="$(npx expo config --json)"
if [ -z "$EXPO_CONFIG_JSON" ]; then
  echo "❌ Failed to load Expo config JSON"
  exit 1
fi

EXPECTED_ENGINE="$(node -e "const cfg = JSON.parse(process.argv[1]); const engine = cfg.${PLATFORM}?.jsEngine ?? cfg.jsEngine ?? 'hermes'; process.stdout.write(String(engine).toLowerCase());" "$EXPO_CONFIG_JSON")"
if [ -z "$EXPECTED_ENGINE" ]; then
  echo "❌ Could not determine expected ${PLATFORM} JS engine from Expo config"
  exit 1
fi

if [ ! -d dist ]; then
  echo "❌ dist folder is missing"
  exit 1
fi

if [ -z "$(find dist -mindepth 1 -maxdepth 1 -print -quit)" ]; then
  echo "❌ dist folder is empty"
  exit 1
fi

# Platform-specific bundle path detection
if [ "$PLATFORM" = "ios" ]; then
  BUNDLE_PATH="$(find dist -type f \( -path "*/_expo/static/js/ios/*.js" -o -path "*/_expo/static/js/ios/*.hbc" \) | head -n1 || true)"
  if [ -z "$BUNDLE_PATH" ]; then
    echo "❌ iOS bundle file not found under dist/_expo/static/js/ios (.js or .hbc)"
    find dist -maxdepth 6 -type f | head -n 50 || true
    exit 1
  fi
  EXPECTED_BUNDLE_SOURCE="expo-export"
elif [ "$PLATFORM" = "android" ]; then
  BUNDLE_PATH="dist/index.android.bundle"
  ASSETS_PATH="dist/assets"
  if [ ! -f "$BUNDLE_PATH" ]; then
    echo "❌ Bundle file missing: $BUNDLE_PATH"
    exit 1
  fi
  if [ ! -d "$ASSETS_PATH" ]; then
    echo "❌ Required assets directory missing: $ASSETS_PATH"
    exit 1
  fi
  EXPECTED_BUNDLE_SOURCE="export:embed"
else
  echo "❌ Unknown platform: $PLATFORM (expected ios or android)"
  exit 1
fi

if [ ! -s "$BUNDLE_PATH" ]; then
  echo "❌ Bundle file is empty: $BUNDLE_PATH"
  exit 1
fi

BUNDLE_SIZE="$(wc -c < "$BUNDLE_PATH" | tr -d ' ')"
HAS_HERMES_MARKER="no"
if grep -a -q "Hermes" "$BUNDLE_PATH"; then
  HAS_HERMES_MARKER="yes"
fi

BUNDLE_SOURCE=""
if [ -f dist/.bundle-source ]; then
  BUNDLE_SOURCE="$(cat dist/.bundle-source)"
fi

if [ "$EXPECTED_ENGINE" = "hermes" ] && [ "$HAS_HERMES_MARKER" != "yes" ] && [ "$BUNDLE_SOURCE" != "$EXPECTED_BUNDLE_SOURCE" ]; then
  echo "❌ Hermes expected but bundle has no Hermes marker and source is not $EXPECTED_BUNDLE_SOURCE"
  exit 1
fi

echo "[validation] platform: $PLATFORM"
echo "[validation] expected engine: $EXPECTED_ENGINE"
echo "[validation] bundle path: $BUNDLE_PATH"
echo "[validation] bundle file size (bytes): $BUNDLE_SIZE"
echo "[validation] hermes marker present: $HAS_HERMES_MARKER"
echo "[validation] bundle source: ${BUNDLE_SOURCE:-unknown}"
