#!/usr/bin/env bash
set -euo pipefail

# === GitHub Actions Runner Registration Script ===
# Registers this Mac as a self-hosted runner *for this repo*.
# Stores the runner under .github/runner/_ so it stays out of version control.

# Store the runner directory inside the repo under .github/runner/_
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
RUNTIME_ROOT="${REPO_ROOT}/.github/runner/_"
RUNNER_DIR="${RUNTIME_ROOT}/actions-runner"
WORKSPACE_DIR="${RUNTIME_ROOT}/workspace"

need() { command -v "$1" >/dev/null 2>&1 || { echo "❌ Missing dependency: $1"; exit 1; }; }
need curl
need tar

mkdir -p "${RUNNER_DIR}"
mkdir -p "${WORKSPACE_DIR}"
cd "${RUNNER_DIR}"

echo "🗝️  GitHub Actions Runner Setup (repo-scoped)"
echo "---------------------------------------------"
echo "📁 Repo root: ${REPO_ROOT}"
echo "📦 Runner dir: ${RUNNER_DIR}"
echo "🗂️  Workspace dir: ${WORKSPACE_DIR}"

# Auto-detect repo and simplify input
REPO_URL="$(git config --get remote.origin.url 2>/dev/null || echo '')"
if [[ -z "$REPO_URL" ]]; then
  echo "❌ Could not detect remote.origin.url. Please set your GitHub remote first."
  echo "   Example: git remote add origin https://github.com/<owner>/<repo>.git"
  exit 1
fi

# Parse OWNER and REPO from REPO_URL (support HTTPS and git@github.com:)
if [[ "$REPO_URL" =~ ^https://github\.com/([^/]+)/([^/]+)(\.git)?$ ]]; then
  OWNER="${BASH_REMATCH[1]}"
  REPO="${BASH_REMATCH[2]}"
elif [[ "$REPO_URL" =~ ^git@github\.com:([^/]+)/([^/]+)(\.git)?$ ]]; then
  OWNER="${BASH_REMATCH[1]}"
  REPO="${BASH_REMATCH[2]}"
else
  echo "❌ Could not parse repository owner and name from remote.origin.url."
  echo "   Please ensure the remote URL is a GitHub HTTPS or SSH URL."
  exit 1
fi
# Normalize REPO to remove trailing .git if present
REPO=${REPO%.git}

echo "🔗 Detected repository: ${OWNER}/${REPO}"

# Prompt for scope
read -rp "Choose scope [repo/org] (default: org): " SCOPE
SCOPE="${SCOPE:-org}"
if [[ "$SCOPE" != "repo" && "$SCOPE" != "org" ]]; then
  echo "❌ Invalid scope. Please enter 'repo' or 'org'."
  exit 1
fi

# Prompt for registration token
if [[ "$SCOPE" == "org" ]]; then
  echo "ℹ️  Generate an *organization-scoped* token: Org → Settings → Actions → Runners → New self-hosted runner (macOS)."
else
  echo "ℹ️  Generate a *repository-scoped* token: Repo → Settings → Actions → Runners → New self-hosted runner (macOS)."
fi
echo "   Note: Registration tokens typically expire within ~1 hour. Generate it right before running this script."
read -rsp "🪪 Registration token (from Settings → Actions → Runners → New self-hosted runner): " TOKEN
echo ""
if [[ -z "$TOKEN" ]]; then
  echo "❌ No token provided. Aborting."
  exit 1
fi

# If org scope, prompt for runner group
if [[ "$SCOPE" == "org" ]]; then
  read -rp "Runner group (optional, default: expo-ci): " RUNNER_GROUP
  RUNNER_GROUP="${RUNNER_GROUP:-expo-ci}"
fi

# Set TARGET_URL based on scope
if [[ "$SCOPE" == "repo" ]]; then
  TARGET_URL="https://github.com/${OWNER}/${REPO}"
else
  TARGET_URL="https://github.com/${OWNER}"
fi

# Auto-generate runner name
RUNNER_NAME="$(hostname | tr '[:upper:]' '[:lower:]')-runner"

# Use default labels unless overridden by env var
LABELS="${RUNNER_LABELS:-self-hosted,macos,arm64}"

echo "🏷️  Runner name: ${RUNNER_NAME}"
echo "🏷️  Runner labels: ${LABELS}"

echo "🔗 Using URL: ${TARGET_URL}"
if [[ "$SCOPE" == "org" ]]; then
  echo "🏷️  Runner group: ${RUNNER_GROUP}"
fi

# Download the latest macOS ARM64 runner if missing
if [ ! -f "./config.sh" ]; then
  echo "⬇️  Downloading latest GitHub Actions runner..."
  LATEST=$(curl -s https://api.github.com/repos/actions/runner/releases/latest | grep browser_download_url | grep osx-arm64 | cut -d '"' -f 4 || true)
  if [ -z "${LATEST}" ]; then
    echo "⚠️  Could not determine latest runner URL (API rate limit?)."
    echo "    Please paste a download URL from https://github.com/actions/runner/releases (osx-arm64):"
    read -rp "    URL: " LATEST
  fi
  curl -L "${LATEST}" -o actions-runner.tar.gz
  tar xzf actions-runner.tar.gz
  rm -f actions-runner.tar.gz
fi

# Configure the runner with isolated workspace
echo "⚙️  Configuring the runner with isolated workspace..."
if [[ "$SCOPE" == "org" ]]; then
  ./config.sh \
    --url "$TARGET_URL" \
    --token "$TOKEN" \
    --name "$RUNNER_NAME" \
    --labels "$LABELS" \
    --runnergroup "$RUNNER_GROUP" \
    --work "../workspace/_work"
else
  ./config.sh \
    --url "$TARGET_URL" \
    --token "$TOKEN" \
    --name "$RUNNER_NAME" \
    --labels "$LABELS" \
    --work "../workspace/_work"
fi

# Create helpful runtime folders (ignored by .gitignore)
mkdir -p "${RUNTIME_ROOT}/logs" || true

cat <<EOF
✅ Runner registered successfully!

📁 Directory: ${RUNNER_DIR}
🗂️  Workspace: ${WORKSPACE_DIR}
▶️  To start manually, run:
   ${REPO_ROOT}/.github/runner/runner.local.sh

💡 All build artifacts will be isolated in the workspace directory.
   Clean up anytime with: ${REPO_ROOT}/.github/runner/cleanup.sh

(Ensure the runner folder .github/runner/_ is ignored by Git.)
EOF