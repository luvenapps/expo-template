#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:-latest}"
INSTALL_URL="https://get.maestro.mobile.dev"

if command -v maestro >/dev/null 2>&1; then
  echo "✅ Maestro already installed: $(maestro --version)"
  exit 0
fi

echo "📦 Installing Maestro CLI (${VERSION})..."
export MAESTRO_VERSION="${VERSION}"

if command -v curl >/dev/null 2>&1; then
  curl -fsSL "${INSTALL_URL}" | bash
elif command -v wget >/dev/null 2>&1; then
  wget -qO- "${INSTALL_URL}" | bash
else
  echo "❌ curl or wget required to install Maestro"
  exit 1
fi

export PATH="$HOME/.maestro/bin:$PATH"

# Persist PATH to subsequent GitHub Actions steps
if [ -n "${GITHUB_PATH:-}" ]; then
  echo "$HOME/.maestro/bin" >> "$GITHUB_PATH"
fi

if ! command -v maestro >/dev/null 2>&1; then
  echo "❌ Maestro installation failed"
  exit 1
fi

echo "✅ Maestro installed successfully: $(maestro --version)"