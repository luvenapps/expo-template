#!/usr/bin/env bash
set -euo pipefail

MISE_VERSION=$(grep '^min_version' "$(dirname "$0")/../.mise.toml" | sed 's/.*= *"\(.*\)"/\1/')
FASTLANE_VERSION="2.228.0"
MAESTRO_VERSION="2.0.6"

if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew is required for this setup script. Install it from https://brew.sh/ and re-run."
  exit 1
fi

packages=(watchman)

for package in "${packages[@]}"; do
  if brew list --versions "$package" >/dev/null 2>&1; then
    echo "✅ $package already installed; skipping"
  else
    echo "📦 Installing $package via Homebrew..."
    brew install "$package"
  fi
done

if brew list --versions mise >/dev/null 2>&1; then
  echo "✅ mise already installed; skipping"
else
  echo "📦 Installing mise (required >= ${MISE_VERSION}) via Homebrew..."
  brew install mise
fi

installed_fastlane=$(brew list --versions fastlane 2>/dev/null | awk '{print $2}')
if [ "${installed_fastlane}" = "${FASTLANE_VERSION}" ]; then
  echo "✅ fastlane ${FASTLANE_VERSION} already installed; skipping"
else
  echo "📦 Installing fastlane ${FASTLANE_VERSION} via Homebrew..."
  brew install fastlane@${FASTLANE_VERSION} 2>/dev/null || brew install fastlane
fi

if brew list --cask --versions maestro 2>/dev/null | grep -q "${MAESTRO_VERSION}"; then
  echo "✅ maestro ${MAESTRO_VERSION} already installed; skipping"
else
  echo "📦 Installing maestro ${MAESTRO_VERSION} via Homebrew..."
  brew install --cask maestro
fi

echo "🔐 Trusting repo-local mise config..."
mise trust

echo "⬇️ Installing pinned runtimes from .mise.toml..."
mise install

# Ensure mise is activated in the user's shell profile
activate_cmd='eval "$(mise activate zsh)"'
shell_rc="$HOME/.zshrc"

if [ "$SHELL" = "/bin/bash" ] || [ "$SHELL" = "/usr/bin/bash" ]; then
  activate_cmd='eval "$(mise activate bash)"'
  shell_rc="$HOME/.bashrc"
fi

if ! grep -qF 'mise activate' "$shell_rc" 2>/dev/null; then
  echo "" >> "$shell_rc"
  echo "# Added by betterhabits setup:local" >> "$shell_rc"
  echo "$activate_cmd" >> "$shell_rc"
  echo "🐚 Added mise activation to $shell_rc — restart your terminal or run: source $shell_rc"
else
  echo "✅ mise activation already present in $shell_rc"
fi

echo "Toolchain check:"
mise ls || true
mise exec -- node -v || true
mise exec -- npm -v || true
mise exec -- java -version || true

echo "Next step: npm ci"
