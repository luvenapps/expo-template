#!/usr/bin/env bash
set -euo pipefail

# === GitHub Actions Runner Cleanup Script ===
# Modes:
#   workspace  -> remove only the working directory used by the self-hosted runner
#   full       -> stop the local runner service (if installed) and remove the runner binaries & workspace
#
# Notes:
# - This does NOT unregister the runner from GitHub (no token prompts). You can still reconfigure later.
# - Safe to re-run: it detects running service / existing folders and skips where appropriate.
# - If no mode is provided and running in an interactive shell, you'll be prompted to choose.

# ------------------------------
# Paths
# ------------------------------
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
RUNNER_BASE="${REPO_ROOT}/.github/runner/_"
RUNNER_DIR="${RUNNER_BASE}/actions-runner"
WORKSPACE_DIR="${RUNNER_BASE}/workspace"

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
Usage: $(basename "$0") [workspace|full]

  workspace   Clean only the runner workspace at:
              ${WORKSPACE_DIR}

  full        Stop local runner service (if installed) and remove:
                • ${RUNNER_DIR}
                • ${WORKSPACE_DIR}

Examples:
  $(basename "$0") workspace
  $(basename "$0") full
USAGE
}

# ------------------------------
# Mode selection (argument or interactive menu)
# ------------------------------
MODE=${1:-}
if [[ -z "${MODE}" ]]; then
  if is_interactive; then
    echo "Select cleanup mode:"
    select choice in "workspace" "full" "quit"; do
      case "$choice" in
        workspace) MODE=workspace; break;;
        full) MODE=full; break;;
        quit) echo "Canceled."; exit 0;;
        *) echo "Please choose 1, 2, or 3.";;
      esac
    done
  else
    usage
    exit 1
  fi
fi

if [[ "${MODE}" != "workspace" && "${MODE}" != "full" ]]; then
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
# Stop service (macOS launchctl) if installed, then remove runner
# ------------------------------
stop_service_if_present() {
  step "Stopping runner service if present"

  # Prefer runner-provided svc.sh if available
  if [[ -x "${RUNNER_DIR}/svc.sh" ]]; then
    # Some versions support 'status'; ignore failures
    if "${RUNNER_DIR}/svc.sh" status >/dev/null 2>&1; then
      "${RUNNER_DIR}/svc.sh" stop || true
    else
      "${RUNNER_DIR}/svc.sh" stop || true
    fi
    okay "svc.sh stop attempted."
  fi

  # Additionally search for any LaunchAgents that reference our RUNNER_DIR
  if command -v launchctl >/dev/null 2>&1; then
    # List user launch agents and unload any that contain the runner directory path
    local plist
    while IFS= read -r plist; do
      [[ -z "$plist" ]] && continue
      if grep -q "${RUNNER_DIR}" "$plist" 2>/dev/null; then
        launchctl bootout "gui/${UID}" "$plist" || true
        okay "Unloaded LaunchAgent: $(basename "$plist")"
      fi
    done < <(find "${HOME}/Library/LaunchAgents" -name '*.plist' -maxdepth 1 -type f 2>/dev/null)
  fi
}

full_cleanup() {
  stop_service_if_present

  step "Removing runner directories"
  if [[ -d "${RUNNER_DIR}" ]]; then
    rm -rf "${RUNNER_DIR}"
    okay "Removed: ${RUNNER_DIR}"
  else
    okay "Runner directory already absent."
  fi

  if [[ -d "${WORKSPACE_DIR}" ]]; then
    rm -rf "${WORKSPACE_DIR}"
    okay "Removed: ${WORKSPACE_DIR}"
  fi

  # Leave the base dir in place
}

# ------------------------------
# Execute
# ------------------------------
case "${MODE}" in
  workspace)
    clean_workspace
    ;;
  full)
    echo "This will STOP any local runner service (if installed) and REMOVE runner binaries + workspace."
    confirm "Proceed with FULL cleanup? (y/N) " || { warn "Full cleanup cancelled"; exit 1; }
    full_cleanup
    ;;
 esac

echo "\n✅ Done"