#!/usr/bin/env bash
set -euo pipefail

# Optional version argument: e.g., ./setup_fastlane.sh 2.222.0
VER="${1:-}"
echo "🚀 Setting up Fastlane ${VER:+(version: $VER)}..."

# If Fastlane already exists, print version and exit
if command -v fastlane >/dev/null 2>&1; then
  echo "✅ Fastlane already installed at $(command -v fastlane)"
  fastlane --version
  exit 0
fi

# Install via RubyGems into the current user's gem directory (no Homebrew required)
echo "⬇️ Installing Fastlane via RubyGems..."
if [ -n "$VER" ]; then
  gem install fastlane -v "$VER" -NV --user-install
else
  gem install fastlane -NV --user-install
fi

# Determine the user's gem bin path (where fastlane gets installed)
GEM_BIN_DIR="$(ruby -e 'require \"rubygems\"; print Gem.user_dir')/bin"
echo "🔗 Gem bin dir: $GEM_BIN_DIR"

# Add gem bin dir to PATH
if [ -n "${GITHUB_PATH:-}" ]; then
  # Running in GitHub Actions
  echo "$GEM_BIN_DIR" >> "$GITHUB_PATH"
  echo "🔗 Added gem bin dir to GitHub Actions PATH"
else
  # Running locally
  SHELL_RC="$HOME/.zshrc"
  [ -n "${BASH_VERSION:-}" ] && SHELL_RC="$HOME/.bashrc"
  if ! grep -q "$GEM_BIN_DIR" "$SHELL_RC" 2>/dev/null; then
    echo "export PATH=\"\$PATH:$GEM_BIN_DIR\"" >> "$SHELL_RC"
    echo "🔗 Added gem bin dir to PATH in $SHELL_RC"
    echo "⚠️  Restart your terminal or run: source $SHELL_RC"
  fi
  export PATH="$PATH:$GEM_BIN_DIR"
fi

echo ""
echo "✅ Fastlane setup complete."
fastlane --version || echo "⚠️  Please restart your shell to activate Fastlane."
