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

echo "\nToolchain check:"
mise ls || true
node -v || true
npm -v || true
java -version || true

echo "\nNext step: npm ci"
