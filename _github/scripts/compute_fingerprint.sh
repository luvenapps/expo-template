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
  # Only hash the credential relevant to this platform
  if [ "$PLATFORM" = "ios" ]; then
    CRED_TO_HASH="${GOOGLE_SERVICE_INFO_PLIST_B64}"
  else
    CRED_TO_HASH="${GOOGLE_SERVICES_JSON_B64}"
  fi

  # Use appropriate hash command based on platform (macOS vs Linux)
  if command -v shasum >/dev/null 2>&1; then
    # macOS
    CREDS_HASH=$(echo -n "${CRED_TO_HASH}" | shasum -a 256 | cut -d' ' -f1 | cut -c1-8)
  else
    # Linux
    CREDS_HASH=$(echo -n "${CRED_TO_HASH}" | sha256sum | cut -d' ' -f1 | cut -c1-8)
  fi
fi

# Output cache key (iOS uses "app", Android uses "apk")
if [ "$PLATFORM" = "ios" ]; then
  CACHE_KEY="ios-app-${HASH}-${FIREBASE_FLAG}-${CREDS_HASH}"
else
  CACHE_KEY="android-apk-${HASH}-${FIREBASE_FLAG}-${CREDS_HASH}"
fi
echo "key=${CACHE_KEY}"
echo "🔑 $(echo "$PLATFORM" | tr '[:lower:]' '[:upper:]')_FINGERPRINT=${HASH} (firebase=${FIREBASE_FLAG}, creds=${CREDS_HASH})"
