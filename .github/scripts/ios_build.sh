#!/usr/bin/env bash
set -euo pipefail

# Expo SDK >=50: use CI=1 instead of --non-interactive
export CI=1

# Ensure native ios/ exists (idempotent on CI)
# Use CI=1; --non-interactive is deprecated
# For CI builds, use xcodebuild directly (faster, headless, and fully scriptable).
# For local development, developers can instead use `npx expo run:ios` to build and launch interactively.
npx expo prebuild -p ios --no-install

# Install pods via RN/Expo wrapper (avoids direct `pod install` deprecation)
npx pod-install

# Determine scheme robustly
SCHEME=""
if command -v jq >/dev/null 2>&1; then
  # Try from expo config first (ios.scheme -> name -> expo.name)
  SCHEME="$(npx -y expo config --json | jq -r '.ios.scheme // .name // .expo.name // empty')"
fi
if [[ -z "${SCHEME}" ]]; then
  # Fallback: ask Xcode for available schemes and pick the first
  if command -v jq >/dev/null 2>&1; then
    SCHEME="$(xcodebuild -workspace ios/*.xcworkspace -list -json | jq -r '.workspace.schemes[0]')"
  fi
fi
if [[ -z "${SCHEME}" ]]; then
  echo "❌ Could not determine Xcode scheme. Ensure expo prebuild generated the workspace and jq is available."
  xcodebuild -workspace ios/*.xcworkspace -list || true
  exit 1
fi

# Use the currently booted simulator's UDID to avoid name mismatches
UDID="$(xcrun simctl list devices booted | awk -F'[()]' '/Booted/ {print $2; exit}')"
if [[ -z "${UDID}" ]]; then
  echo "❌ No booted simulator UDID found. Did the previous step boot a simulator?"
  xcrun simctl list devices || true
  exit 1
fi

# Build for the booted simulator UDID
xcodebuild \
  -workspace ios/*.xcworkspace \
  -scheme "${SCHEME}" \
  -configuration ${XCODE_CONFIGURATION:-Release} -sdk iphonesimulator \
  -destination "platform=iOS Simulator,id=${UDID}" \
  -derivedDataPath ios/build build