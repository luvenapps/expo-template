#!/usr/bin/env bash
set -euo pipefail

# 🏷️ Accept an optional tag argument (default: v2.0.3)
TAG="${1:-v2.0.3}"

echo "📦 Setting up Maestro CLI (tag: $TAG)..."

# ✅ If Maestro is already installed, skip reinstall
if command -v maestro >/dev/null 2>&1; then
  echo "✅ Maestro already installed at $(command -v maestro)"
  maestro --version
  exit 0
fi

# 🧩 Install Maestro CLI
echo "⬇️ Installing Maestro CLI ${TAG}..."
curl -fsSL "https://get.maestro.mobile.dev" | bash -s -- -b "$HOME/.maestro" --tag "${TAG}"
echo "✅ Maestro installed successfully at $HOME/.maestro/bin"

# 🧠 Add Maestro to PATH (GitHub Actions or local shell)
if [ -n "${GITHUB_PATH:-}" ]; then
  # Running inside GitHub Actions
  echo "$HOME/.maestro/bin" >> "$GITHUB_PATH"
  echo "🔗 Added Maestro to GitHub Actions PATH"
else
  # Running locally
  SHELL_RC="$HOME/.zshrc"
  [ -n "${BASH_VERSION:-}" ] && SHELL_RC="$HOME/.bashrc"
  
  if ! grep -q 'PATH=.*.maestro/bin' "$SHELL_RC"; then
    echo 'export PATH="$PATH:$HOME/.maestro/bin"' >> "$SHELL_RC"
    echo "🔗 Added Maestro to PATH in $SHELL_RC"
    echo "⚠️  Restart your terminal or run: source $SHELL_RC"
  fi
fi

# 🧾 Confirm installation
echo ""
echo "✅ Maestro setup complete."
maestro --version || echo "⚠️  Please restart your shell to activate Maestro."