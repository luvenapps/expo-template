#!/usr/bin/env bash
set -euo pipefail

# Compute build fingerprint for caching
# Usage: ./compute_fingerprint.sh <platform>
# Example: ./compute_fingerprint.sh ios

PLATFORM="${1:-}"

if [ -z "$PLATFORM" ]; then
  echo "Error: Platform argument required (ios or android)" >&2
  exit 1
fi

if [ "$PLATFORM" != "ios" ] && [ "$PLATFORM" != "android" ]; then
  echo "Error: Platform must be 'ios' or 'android'" >&2
  exit 1
fi

FIREBASE_FLAG="${EXPO_PUBLIC_TURN_ON_FIREBASE:-false}"

# Use Expo's native fingerprint tool to detect changes that require a rebuild
HASH=$(npx @expo/fingerprint fingerprint:generate --platform "$PLATFORM" | node -e "console.log(JSON.parse(require('fs').readFileSync(0, 'utf-8')).hash)")

# Hash Firebase credentials to bust cache when they change
CREDS_HASH=""
if [ "$FIREBASE_FLAG" = "true" ]; then
  # Use appropriate hash command based on platform (macOS vs Linux)
  if command -v shasum >/dev/null 2>&1; then
    # macOS
    CREDS_HASH=$(echo -n "${GOOGLE_SERVICE_INFO_PLIST_B64}${GOOGLE_SERVICES_JSON_B64}" | shasum -a 256 | cut -d' ' -f1 | cut -c1-8)
  else
    # Linux
    CREDS_HASH=$(echo -n "${GOOGLE_SERVICE_INFO_PLIST_B64}${GOOGLE_SERVICES_JSON_B64}" | sha256sum | cut -d' ' -f1 | cut -c1-8)
  fi
fi

# Output cache key (iOS uses "app", Android uses "apk")
if [ "$PLATFORM" = "ios" ]; then
  CACHE_KEY="ios-app-${HASH}-${FIREBASE_FLAG}-${CREDS_HASH}"
else
  CACHE_KEY="android-apk-${HASH}-${FIREBASE_FLAG}-${CREDS_HASH}"
fi
echo "key=${CACHE_KEY}"
echo "🔑 ${PLATFORM^^}_FINGERPRINT=${HASH} (firebase=${FIREBASE_FLAG}, creds=${CREDS_HASH})"
