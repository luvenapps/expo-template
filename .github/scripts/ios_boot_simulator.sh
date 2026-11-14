#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
source "$SCRIPT_DIR/with_timeout.sh"
mkdir -p e2e-artifacts
rm -f .simulator_udid

# Select one specific simulator, then launch the UI bundled with active Xcode.
run_with_timeout 30 xcrun simctl list devices available --json > e2e-artifacts/devices.json
UDID=$(python3 - "${IOS_DEVICE:-}" <<'PY'
import json, sys
with open('e2e-artifacts/devices.json') as file:
    devices = [device for group in json.load(file)['devices'].values() for device in group]
requested = sys.argv[1]
matches = [device for device in devices if device['name'] == requested] if requested else [device for device in devices if device['name'].startswith('iPhone')]
if not matches:
    sys.exit(f'No available simulator matching {requested or "iPhone"}')
print(matches[0]['udid'])
PY
)

open_simulator_ui() {
  local developer_dir xcode_app device_hub_app simulator_app
  developer_dir="$(xcode-select -p)"
  xcode_app="${developer_dir%/Contents/Developer}"
  device_hub_app="$xcode_app/Contents/Applications/DeviceHub.app"
  simulator_app="$developer_dir/Applications/Simulator.app"

  if [ -d "$device_hub_app" ]; then
    echo "📱 Opening Device Hub..."
    open -a "$device_hub_app"
  elif [ -d "$simulator_app" ]; then
    echo "📱 Opening Simulator..."
    open -a "$simulator_app"
  else
    echo "❌ No simulator UI found in the active Xcode installation" >&2
    echo "   Active Developer directory: $developer_dir" >&2
    echo "   Expected Device Hub: $device_hub_app" >&2
    echo "   Expected Simulator: $simulator_app" >&2
    return 1
  fi
}

# One readiness gate with a wall-clock deadline. bootstatus waits for OS services,
# rather than treating the early "Booted" state as ready to install applications.
ATTEMPTS="${RETRIES:-2}"
DELAY="${RETRY_DELAY:-2}"
for ((attempt=1; attempt<=ATTEMPTS; attempt++)); do
  echo "Booting $UDID (attempt $attempt/$ATTEMPTS)"
  if run_with_timeout 180 xcrun simctl bootstatus "$UDID" -b > e2e-artifacts/bootstatus.log 2>&1; then
    cat e2e-artifacts/bootstatus.log
    open_simulator_ui
    printf '%s\n' "$UDID" > .simulator_udid
    exit 0
  fi
  cat e2e-artifacts/bootstatus.log
  if [ "$attempt" -lt "$ATTEMPTS" ]; then
    run_with_timeout 30 xcrun simctl shutdown "$UDID" || true
    run_with_timeout 30 xcrun simctl erase "$UDID" || true
    sleep "$DELAY"
  fi
done
echo 'Simulator failed to become ready within the boot deadline' >&2
exit 1
