#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
source "$SCRIPT_DIR/with_timeout.sh"
APP="${1:?App path required}"
test -d "$APP"
UDID=$(tr -d '[:space:]' < .simulator_udid)
test -n "$UDID"

# The boot stage owns readiness. Maestro owns launching and testing the app.
# Hosted test runners are fresh, so no uninstall or extra warm-up is needed.
for attempt in 1 2; do
  if run_with_timeout 120 xcrun simctl install "$UDID" "$APP"; then
    exit 0
  fi
  echo "Install attempt $attempt failed" >&2
done
exit 1
