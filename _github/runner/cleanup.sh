#!/usr/bin/env bash
set -euo pipefail

# === GitHub Actions Runner Cleanup Script ===
# Cleans the working directory used by the self-hosted runner.
#
# Notes:
# - This does NOT unregister the runner from GitHub (no token prompts). You can still reconfigure later.
# - Safe to re-run: it detects running service / existing folders and skips where appropriate.
# - If no mode is provided and running in an interactive shell, you'll be prompted to choose.

# ------------------------------
# Paths
# ------------------------------
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
RUNNER_BASE="${HOME}/.github"
RUNNER_DIR="${RUNNER_BASE}/actions-runner"
WORKSPACE_DIR="${RUNNER_BASE}/actions-runner-workspace"

# ------------------------------
# Helpers
# ------------------------------
confirm() {
  local prompt=${1:-"Are you sure? (y/N) "}
  read -r -p "$prompt" ans || true
  [[ "$ans" =~ ^[Yy]$ ]]
}

info()  { echo -e "${1}"; }
warn()  { echo -e "\033[33m${1}\033[0m"; }
okay()  { echo -e "✅ ${1}"; }
step()  { echo -e "\n── ${1} ──"; }

is_interactive() { [[ -t 0 ]] && [[ -t 1 ]]; }

usage() {
  cat <<USAGE
Usage: $(basename "$0")

This script cleans the runner workspace at:
  ${WORKSPACE_DIR}
USAGE
}

# ------------------------------
# Mode selection (argument or interactive menu)
# ------------------------------
if [[ $# -gt 0 ]]; then
  usage
  exit 1
fi

# ------------------------------
# Workspace cleanup
# ------------------------------
clean_workspace() {
  step "Cleaning runner workspace"
  info "📍 Location: ${WORKSPACE_DIR}"

  if [[ ! -d "${WORKSPACE_DIR}" ]]; then
    okay "Workspace directory doesn't exist. Nothing to clean."
    return 0
  fi

  local size
  size=$(du -sh "${WORKSPACE_DIR}" 2>/dev/null | cut -f1 || echo "unknown")
  echo "This will delete checked-out repos and build artifacts in the workspace."
  confirm "Continue? (y/N) " || { warn "Cleanup cancelled"; exit 1; }

  rm -rf "${WORKSPACE_DIR}"
  mkdir -p "${WORKSPACE_DIR}"
  okay "Workspace cleaned (freed: ${size})."
}

# ------------------------------
# Execute
# ------------------------------
clean_workspace

echo "\n✅ Done"
