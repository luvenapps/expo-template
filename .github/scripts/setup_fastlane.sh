#!/usr/bin/env bash
set -euo pipefail

VER="${1:?Fastlane version required}"

echo "🔧 Ensuring fastlane ${VER}..."

# Ensure the user gem bin dir is on PATH FIRST before checking/installing
BIN_DIR="$(ruby -e 'require "rubygems"; print Gem.user_dir')/bin"
case ":$PATH:" in
  *":$BIN_DIR:"*) : ;;
  *) export PATH="$BIN_DIR:$PATH" ;;
esac

# Persist to later GitHub Actions steps
if [ -n "${GITHUB_PATH:-}" ]; then
  echo "$BIN_DIR" >> "$GITHUB_PATH"
fi

# Detect currently installed fastlane version (if any)
CUR_VER=""
if command -v fastlane >/dev/null 2>&1; then
  # `fastlane --version` prints like: fastlane 2.228.0
  CUR_VER="$(fastlane --version 2>&1 | awk '{for(i=1;i<=NF;i++) if($i ~ /^[0-9]+\.[0-9]+\.[0-9]+$/) print $i}' | head -1)"
fi

# Install or switch versions if needed
if [ -z "$CUR_VER" ] || [ "$CUR_VER" != "$VER" ]; then
  echo "📦 Installing fastlane ${VER}..."
  # Remove any existing fastlane to avoid mixed dependencies
  gem uninstall -aIx fastlane >/dev/null 2>&1 || true
  gem install -N -q --user-install fastlane -v "$VER"
else
  echo "✅ fastlane ${VER} already installed"
fi

# Give the system a moment to recognize the newly installed gem
sleep 1

# Refresh hash to ensure we find the newly installed fastlane
hash -r

# Final sanity checks
command -v fastlane >/dev/null 2>&1 || { echo "❌ Fastlane not found in PATH"; exit 1; }
ACT_VER="$(fastlane --version 2>&1 | awk '{for(i=1;i<=NF;i++) if($i ~ /^[0-9]+\.[0-9]+\.[0-9]+$/) print $i}' | head -1)"

if [ -z "$ACT_VER" ]; then
  echo "❌ Could not determine fastlane version"
  echo "Full output: $(fastlane --version 2>&1)"
  exit 1
fi

if [ "$ACT_VER" != "$VER" ]; then
  echo "❌ Fastlane version mismatch: expected $VER, got $ACT_VER"
  exit 1
fi

echo "✅ fastlane ${ACT_VER} successfully installed and verified"