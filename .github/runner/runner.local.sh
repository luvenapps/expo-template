#!/usr/bin/env bash
set -euo pipefail

# === GitHub Actions Local Runner Script ===
# Starts your self-hosted GitHub Actions runner MANUALLY (no background service).
# Keep this terminal open while it runs — press Ctrl+C to stop it.

# Store the runner runtime under ~/.github so launchd can access it on macOS
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
RUNNER_BASE="${HOME}/.github"
RUNNER_DIR="${RUNNER_BASE}/actions-runner"
WORKSPACE_DIR="${RUNNER_BASE}/actions-runner-workspace"

# Helpful pointers
REGISTER_HELP="${REPO_ROOT}/.github/runner/register-runner.sh"
DOCS_HELP="${REPO_ROOT}/docs/GITHUBACTIONS.md"

if [ ! -d "${RUNNER_DIR}" ] || [ ! -f "${RUNNER_DIR}/run.sh" ]; then
  echo "❌ Runner binaries not found at:"
  echo "   ${RUNNER_DIR}"
  echo ""
  echo "👉 Register this machine as a runner first using the helper script:"
  echo "   ${REGISTER_HELP}"
  echo ""
  echo "   or follow the manual steps in:"
  echo "   ${DOCS_HELP}"
  exit 1
fi

# === Isolate build artifacts to workspace directory ===
echo "🔧 Setting up isolated workspace at: ${WORKSPACE_DIR}"
mkdir -p "${WORKSPACE_DIR}"

# Export isolated environment variables
export RUNNER_WORKSPACE="${WORKSPACE_DIR}"
export ANDROID_SDK_ROOT="${WORKSPACE_DIR}/android-sdk"
export ANDROID_HOME="${WORKSPACE_DIR}/android-sdk"
export GRADLE_USER_HOME="${WORKSPACE_DIR}/.gradle"
export ANDROID_USER_HOME="${WORKSPACE_DIR}/.android"
export DERIVED_DATA_PATH="${WORKSPACE_DIR}/xcode-derived"

cd "${RUNNER_DIR}"

echo "🚀 Starting GitHub Actions runner..."
echo "📍 Repo: ${REPO_ROOT}"
echo "📦 Runner dir: ${RUNNER_DIR}"
echo "🗂️  Workspace: ${WORKSPACE_DIR}"
echo "🔄 Press Ctrl+C to stop the runner at any time."
echo ""
echo "💡 Tip: Run '.github/runner/cleanup.sh' to delete all build artifacts"
echo ""

exec ./run.sh
