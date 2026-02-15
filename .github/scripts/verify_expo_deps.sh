#!/usr/bin/env bash
set -e

# Prints Expo/RN versions and fails if peer dependencies are mismatched.
# Usage: verify_expo_deps.sh

npx expo --version || true
node -e "console.log('react-native', require('react-native/package.json').version)" || true
node -e "console.log('expo', require('expo/package.json').version)" || true

# Strict: fail if mismatched so the step is marked failed (workflow may continue via continue-on-error)
if ! npx expo install --check; then
  echo "⚠️ Expo dependency drift detected. Run npx expo install --fix locally to align versions."
  exit 1
fi
