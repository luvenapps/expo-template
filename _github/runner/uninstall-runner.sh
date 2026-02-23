#!/usr/bin/env bash
set -euo pipefail

# === GitHub Actions Runner Uninstall Script ===
# Stops and unregisters the runner, then optionally removes local files.
#
# Usage:
#   .github/runner/uninstall-runner.sh
#
# Notes:
# - Requires a fresh REMOVE token from GitHub UI:
#   Repo → Settings → Actions → Runners → Remove

RUNNER_BASE="${HOME}/.github"
RUNNER_DIR="${RUNNER_BASE}/actions-runner"
WORKSPACE_DIR="${RUNNER_BASE}/actions-runner-workspace"

die() { echo "❌ $*" >&2; exit 1; }
note() { echo "ℹ️  $*"; }
ok() { echo "✅ $*"; }

if [[ ! -d "${RUNNER_DIR}" ]]; then
  die "Runner directory not found at: ${RUNNER_DIR}"
fi

if [[ ! -x "${RUNNER_DIR}/config.sh" ]]; then
  die "config.sh not found at: ${RUNNER_DIR}"
fi

note "Stopping runner service (if installed)..."
if [[ -x "${RUNNER_DIR}/svc.sh" ]]; then
  "${RUNNER_DIR}/svc.sh" stop >/dev/null 2>&1 || true
  if ! "${RUNNER_DIR}/svc.sh" uninstall >/dev/null 2>&1; then
    note "svc.sh uninstall did not complete cleanly; continuing with cleanup."
  fi
fi

# Best-effort cleanup if launchd still holds the agent
if command -v launchctl >/dev/null 2>&1; then
  if ls "${HOME}/Library/LaunchAgents"/actions.runner.*.plist >/dev/null 2>&1; then
    for plist in "${HOME}/Library/LaunchAgents"/actions.runner.*.plist; do
      launchctl bootout "gui/${UID}" "$plist" >/dev/null 2>&1 || true
      rm -f "$plist" || true
    done
  fi
fi

# If svc.sh uninstall failed, config.sh remove will refuse to proceed when .service exists.
if [[ -f "${RUNNER_DIR}/.service" ]]; then
  note "Removing stale service marker: ${RUNNER_DIR}/.service"
  rm -f "${RUNNER_DIR}/.service" || true
fi

echo "ℹ️  Get a REMOVE token from:"
echo "   Repo → Settings → Actions → Runners → Remove"
read -rsp "🪪 Remove token: " TOKEN
echo ""
if [[ -z "${TOKEN}" ]]; then
  die "No token provided. Aborting."
fi

note "Unregistering runner..."
cd "${RUNNER_DIR}"
./config.sh remove --token "${TOKEN}"
ok "Runner unregistered."

read -r -p "Remove runner files in ${RUNNER_DIR}? (y/N) " REMOVE_FILES
if [[ "${REMOVE_FILES}" =~ ^[Yy]$ ]]; then
  rm -rf "${RUNNER_DIR}"
  ok "Removed ${RUNNER_DIR}"
fi

read -r -p "Remove runner workspace in ${WORKSPACE_DIR}? (y/N) " REMOVE_WORKSPACE
if [[ "${REMOVE_WORKSPACE}" =~ ^[Yy]$ ]]; then
  rm -rf "${WORKSPACE_DIR}"
  ok "Removed ${WORKSPACE_DIR}"
fi

ok "Done."
