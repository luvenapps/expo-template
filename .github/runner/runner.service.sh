#!/usr/bin/env bash
set -euo pipefail

# === GitHub Actions Runner Service Manager (macOS) ============================
# Starts/stops the runner as a BACKGROUND SERVICE using svc.sh (launchd).
# Idempotent: "start" won't error if already running, "stop" won't error if stopped.
#
# Usage:
#   .github/runner/runner.service.sh start    # install (if needed) + start
#   .github/runner/runner.service.sh stop     # stop (if running)
#   .github/runner/runner.service.sh restart  # stop then start
#   .github/runner/runner.service.sh status   # show service status
#   .github/runner/runner.service.sh logs     # tail recent runner logs
#
# Notes:
# - Requires the runner to be registered/configured already (see register-runner.sh).
# - This script does NOT auto-install/register a runner; it only manages the service.
# ============================================================================

# Resolve repo root and runner directories (stored under ~/.github)
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
RUNNER_BASE="${HOME}/.github"
RUNNER_DIR="${RUNNER_BASE}/actions-runner"
REGISTER_HELP="${REPO_ROOT}/.github/runner/register-runner.sh"

SVC="${RUNNER_DIR}/svc.sh"
RUN_SH="${RUNNER_DIR}/run.sh"

die() { echo "❌ $*" >&2; exit 1; }
note() { echo "ℹ️  $*"; }
ok()   { echo "✅ $*"; }
warn() { echo "⚠️  $*"; }

require_runner() {
  if [[ ! -d "${RUNNER_DIR}" || ! -f "${RUN_SH}" || ! -f "${SVC}" ]]; then
    die "Runner service files not found in:
    ${RUNNER_DIR}

    ➜ Please register this machine as a runner first:
       ${REGISTER_HELP}"
  fi
}

svc_status_raw() {
  # We rely on GitHub’s svc.sh status output; it uses launchctl under the hood.
  # Don’t fail the pipeline if status returns non-zero; we parse its output.
  if ! out="$(cd "${RUNNER_DIR}" && "${SVC}" status 2>&1 || true)"; then
    echo "${out}"
  else
    echo "${out}"
  fi
}

is_running() {
  # Consider it running if status mentions "running" or "Started" (case-insensitive)
  local out
  out="$(svc_status_raw)"
  echo "${out}" | grep -qiE "running|started"
}

is_installed() {
  # Installed if svc.sh status mentions a label/plist (heuristic) OR launchctl knows it
  # Fallback to checking LaunchAgents existence
  local status_out
  status_out="$(svc_status_raw)"
  if echo "${status_out}" | grep -qi "not installed"; then
    return 1
  fi

  local label_hint
  label_hint="$(echo "${status_out}" | grep -iE 'actions\.runner\.' || true)"
  if [[ -n "${label_hint}" ]]; then
    return 0
  fi

  # Fallback check in LaunchAgents (common path for svc.sh on macOS):
  if ls "${HOME}/Library/LaunchAgents"/actions.runner.*.plist >/dev/null 2>&1; then
    return 0
  fi

  return 1
}

do_install_if_needed() {
  if is_installed; then
    note "Service already installed."
    return 0
  fi

  note "Installing runner service..."
  if ! (cd "${RUNNER_DIR}" && "${SVC}" install >/dev/null 2>&1); then
    die "Failed to install service. On macOS, svc.sh must not be run with sudo."
  fi
  ok "Service installed."
}

cmd_start() {
  require_runner
  do_install_if_needed

  if is_running; then
    ok "Runner service already running."
    return 0
  fi

  note "Starting runner service..."
  if ! (cd "${RUNNER_DIR}" && "${SVC}" start >/dev/null 2>&1); then
    die "Failed to start service. On macOS, svc.sh must not be run with sudo."
  fi

  # Brief wait & re-check
  sleep 2
  if is_running; then
    ok "Runner service started."
  else
    warn "Start command issued but service does not appear to be running yet."
    echo "---- svc.sh status ----"
    svc_status_raw
    echo "-----------------------"
    exit 1
  fi
}

cmd_stop() {
  require_runner
  if ! is_installed; then
    ok "Runner service not installed; nothing to stop."
    return 0
  fi

  if ! is_running; then
    ok "Runner service already stopped."
    return 0
  fi

  note "Stopping runner service..."
  if ! (cd "${RUNNER_DIR}" && "${SVC}" stop >/dev/null 2>&1); then
    die "Failed to stop service. On macOS, svc.sh must not be run with sudo."
  fi

  # Brief wait & re-check
  sleep 1
  if is_running; then
    warn "Service still appears to be running after stop."
    exit 1
  fi
  ok "Runner service stopped."
}

cmd_restart() {
  cmd_stop || true
  cmd_start
}

cmd_status() {
  require_runner
  echo "📍 Repo: ${REPO_ROOT}"
  echo "📦 Runner dir: ${RUNNER_DIR}"
  echo "---- svc.sh status ----"
  svc_status_raw
  echo "-----------------------"

  if is_running; then
    ok "Service is running."
    exit 0
  else
    warn "Service is not running."
    exit 1
  fi
}

cmd_logs() {
  local status_out label
  status_out="$(svc_status_raw)"
  label="$(echo "${status_out}" | sed -n 's/^status \(actions\.runner\.[^:]*\):.*/\1/p' | head -n1)"

  if [[ -z "${label}" ]]; then
    warn "Could not determine runner label from service status."
    echo "---- svc.sh status ----"
    echo "${status_out}"
    echo "-----------------------"
    return 1
  fi

  local log_dir="${HOME}/Library/Logs/${label}"
  local log_files=()
  for f in "${log_dir}"/*.log; do
    if [[ -f "$f" ]]; then
      log_files+=("$f")
    fi
  done

  if [[ ${#log_files[@]} -eq 0 ]]; then
    warn "No runner logs found for label '${label}' in ${log_dir}"
    echo "Tip: Check '$(dirname "$SVC")/_diag' or run: ${SVC} status"
    return 1
  fi

  echo "ℹ️  Following logs for '${label}'. Press Ctrl+C to stop."
  if [[ -t 1 ]]; then
    tail -n 200 -F "${log_files[@]}" | awk '
      BEGIN {
        c_reset = "\033[0m";
        c_hdr = "\033[1;36m";
        c_out = "\033[0;37m";
        c_err = "\033[1;31m";
        stream = "stdout";
      }
      /^==> .* <==$/ {
        if ($0 ~ /stderr\.log/) stream = "stderr";
        else stream = "stdout";
        print c_hdr $0 c_reset;
        next;
      }
      {
        if (stream == "stderr") print c_err $0 c_reset;
        else print c_out $0 c_reset;
      }
    '
  else
    tail -n 200 -F "${log_files[@]}"
  fi
}

usage() {
  cat <<EOF
GitHub Actions Runner Service Manager

Usage:
  $(basename "$0") start     Install (if needed) and start the service
  $(basename "$0") stop      Stop the service if running
  $(basename "$0") restart   Restart the service
  $(basename "$0") status    Show service status (exit 0 if running)
  $(basename "$0") logs      Tail recent runner logs (best-effort)

Runner dir: ${RUNNER_DIR}
Register script (if needed): ${REGISTER_HELP}
EOF
}

main() {
  local cmd="${1:-}"
  case "${cmd}" in
    start)   cmd_start ;;
    stop)    cmd_stop ;;
    restart) cmd_restart ;;
    status)  cmd_status ;;
    logs)    cmd_logs ;;
    ""|help|-h|--help) usage ;;
    *) die "Unknown command: ${cmd}. Run with --help for usage." ;;
  esac
}

main "$@"
