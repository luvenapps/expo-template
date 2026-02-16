#!/usr/bin/env bash
set -euo pipefail

if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew is required for this setup script. Install it from https://brew.sh/ and re-run."
  exit 1
fi

packages=(mise fastlane watchman)

for package in "${packages[@]}"; do
  if brew list --versions "$package" >/dev/null 2>&1; then
    echo "✅ $package already installed; skipping"
  else
    echo "📦 Installing $package via Homebrew..."
    brew install "$package"
  fi
done

echo "🔐 Trusting repo-local mise config..."
mise trust

echo "⬇️ Installing pinned runtimes from mise.toml..."
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
