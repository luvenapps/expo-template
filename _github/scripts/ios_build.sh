#!/usr/bin/env bash
set -euo pipefail

# Expo SDK >=50: use CI=1 instead of --non-interactive
export CI=1

# Ensure native iOS project exists (idempotent in CI)
# For CI builds, we use xcodebuild directly (faster/headless).
# For local dev you can use: npx expo run:ios
npx expo prebuild -p ios --no-install

# Install pods via Expo/RN wrapper
npx pod-install

# ------------------------------------------------------------
# Determine the correct Xcode scheme (NOT the URL scheme)
# Scheme is derived from Expo "name" with punctuation stripped.
# Example: "expo-template-testing" -> "expotemplatetesting"
# ------------------------------------------------------------

sanitize_scheme() {
  # lower-case and keep only letters/digits
  printf "%s" "$1" | tr '[:upper:]' '[:lower:]' | tr -cd '[:alnum:]'
}

WORKSPACE_PATH="$(ls ios/*.xcworkspace | head -n1)"

# Candidate from Expo name (NOT ios.scheme, which is a URL scheme)
CANDIDATE_FROM_NAME=""
if command -v jq >/dev/null 2>&1; then
  EXPO_NAME="$(npx -y expo config --json | jq -r '.name // .expo.name // empty')"
else
  # Fallback via node if jq is unavailable
  EXPO_NAME="$(node -e "try{const c=require('child_process').execSync('npx -y expo config --json',{stdio:['ignore','pipe','inherit']}).toString();const j=JSON.parse(c);console.log(j.name||j.expo?.name||'');}catch(e){process.exit(0)}")"
fi
if [ -n "${EXPO_NAME:-}" ] && [ "${EXPO_NAME}" != "null" ]; then
  CANDIDATE_FROM_NAME="$(sanitize_scheme "$EXPO_NAME")"
fi

# Ask Xcode for actual schemes (take the first if jq is available)
SCHEMES_OUTPUT=""
if command -v jq >/dev/null 2>&1; then
  SCHEMES_OUTPUT="$(xcodebuild -workspace "$WORKSPACE_PATH" -list -json | jq -r '.workspace.schemes[]' | grep -vE 'Pods|Tests' | head -n1 || true)"
else
  SCHEMES_OUTPUT="$(xcodebuild -workspace "$WORKSPACE_PATH" -list -json 2>/dev/null \
    | python3 -c 'import sys,json; d=json.load(sys.stdin); schemes=d.get(\"workspace\",{}).get(\"schemes\",[]); [print(s) for s in schemes if not (s.startswith(\"Pods\") or s.endswith(\"Tests\") or s.endswith(\"UITests\"))]' 2>/dev/null | head -n1 || true)"
fi

SCHEME=""
if [ -n "${CANDIDATE_FROM_NAME:-}" ] && [ -n "${SCHEMES_OUTPUT:-}" ]; then
  lower_candidate="$(printf "%s" "$CANDIDATE_FROM_NAME" | tr '[:upper:]' '[:lower:]')"
  lower_scheme="$(printf "%s" "$SCHEMES_OUTPUT" | tr '[:upper:]' '[:lower:]')"
  if [ "$lower_candidate" = "$lower_scheme" ]; then
    SCHEME="$SCHEMES_OUTPUT"
  fi
fi
[ -z "$SCHEME" ] && SCHEME="${SCHEMES_OUTPUT}"

if [ -z "$SCHEME" ]; then
  echo "❌ Could not determine Xcode scheme. Ensure 'npx expo prebuild -p ios' ran successfully."
  xcodebuild -workspace "$WORKSPACE_PATH" -list || true
  exit 1
fi

echo "📦 Workspace: $WORKSPACE_PATH"
echo "🧭 Scheme:    $SCHEME"

# Use the currently booted simulator's UDID to avoid name mismatches
UDID="$(xcrun simctl list devices booted | awk -F'[()]' '/Booted/ {print $2; exit}')"
if [[ -z "${UDID}" ]]; then
  echo "❌ No booted simulator UDID found. Did your previous step boot a simulator?"
  xcrun simctl list devices || true
  exit 1
fi

# Build for the booted simulator UDID
xcodebuild \
  -workspace "$WORKSPACE_PATH" \
  -scheme "$SCHEME" \
  -configuration "${XCODE_CONFIGURATION:-Release}" \
  -sdk iphonesimulator \
  -destination "platform=iOS Simulator,id=${UDID}" \
  -derivedDataPath ios/build \
  build