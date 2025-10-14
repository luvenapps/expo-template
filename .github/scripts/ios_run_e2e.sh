#!/usr/bin/env bash
set -euo pipefail

maestro --version
rm -rf e2e-artifacts
mkdir -p e2e-artifacts

# Portable timeout wrapper: prefer timeout/gtimeout; fallback to Perl alarm (macOS ships Perl)
run_with_timeout() {
  local seconds="$1"; shift
  if command -v timeout >/dev/null 2>&1; then
    timeout "$seconds" "$@"
  elif command -v gtimeout >/dev/null 2>&1; then
    gtimeout "$seconds" "$@"
  else
    perl -e 'alarm shift; exec @ARGV' "$seconds" "$@"
  fi
}

# Run Maestro tests with a 10-minute timeout (600s)
if run_with_timeout 600 maestro test .maestro/flows/smoke.ios.yaml --test-output-dir ./e2e-artifacts; then
  echo "✅ E2E tests passed"
  echo 0 > e2e-artifacts/EXITCODE
else
  EXIT_CODE=$?
  echo "❌ E2E tests failed with exit code: ${EXIT_CODE}"
  echo "Hint: install coreutils to get 'gtimeout' on macOS: brew install coreutils"
  echo "Or increase the limit by editing ios_run_e2e.sh"
  echo "${EXIT_CODE}" > e2e-artifacts/EXITCODE
fi