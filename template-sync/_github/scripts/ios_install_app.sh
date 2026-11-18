#!/bin/bash
set -euo pipefail

APP="${1:?App path required}"

[ -d "$APP" ] || { echo "❌ App not found: $APP"; exit 1; }

BID=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$APP/Info.plist")
[ -n "$BID" ] || { echo "❌ Failed to extract bundle ID"; exit 1; }

# Timeout wrapper for macOS (no GNU timeout available)
run_with_timeout() {
  local timeout="$1"
  shift
  local cmd=("$@")

  # Start the command in background
  "${cmd[@]}" &
  local pid=$!
  local start=$(date +%s)

  # Poll until timeout or process exits
  while kill -0 "$pid" 2>/dev/null; do
    local now=$(date +%s)
    if [ $((now - start)) -ge "$timeout" ]; then
      echo "⏰ Command timed out after ${timeout}s: ${cmd[*]}"
      kill -TERM "$pid" 2>/dev/null || true
      sleep 1
      kill -KILL "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
      return 124
    fi
    sleep 0.5
  done

  # Capture the exit code
  local rc=0
  wait "$pid" 2>/dev/null || rc=$?
  return "$rc"
}

# Determine simulator UDID (prefer value recorded by boot script)
UDID_FILE=".simulator_udid"
UDID=""

echo "🔍 Looking for UDID file: $UDID_FILE in $(pwd)"
if [ -f "$UDID_FILE" ]; then
  echo "✓ Found UDID file"
  UDID=$(tr -d '[:space:]' < "$UDID_FILE" 2>/dev/null || echo "")
  if [ -n "$UDID" ]; then
    echo "📱 Using simulator from boot script: $UDID"
  else
    echo "⚠️  .simulator_udid file was empty; ignoring"
    UDID=""
  fi
else
  echo "⚠️  UDID file not found"
fi

if [ -z "$UDID" ]; then
  echo "ℹ️  No simulator UDID recorded, searching for booted simulator..."
  UDID=$(xcrun simctl list devices | grep "(Booted)" | grep -oE '[a-fA-F0-9]{8}-([a-fA-F0-9]{4}-){3}[a-fA-F0-9]{12}' | head -1)
  [ -n "$UDID" ] || { echo "❌ No booted simulator"; exit 1; }
  echo "📱 Simulator: $UDID"
fi

# Wait for simulator to be fully ready using polling (avoid bootstatus which can hang)
echo "⏳ Waiting for simulator to be ready..."
MAX_WAIT=120
WAITED=0
RESPONSIVE=false

while [ $WAITED -lt $MAX_WAIT ]; do
  # Check if we can spawn a process with timeout protection
  if run_with_timeout 5 xcrun simctl spawn "$UDID" launchctl print system >/dev/null 2>&1; then
    echo "✅ Simulator is responsive after ${WAITED}s"
    RESPONSIVE=true
    break
  fi
  
  sleep 2
  WAITED=$((WAITED + 2))
  
  # Print progress every 20 seconds
  if [ $((WAITED % 20)) -eq 0 ]; then
    echo "   Still waiting... (${WAITED}/${MAX_WAIT}s)"
  fi
done

if [ "$RESPONSIVE" = false ]; then
  echo "❌ Simulator failed to become responsive after ${MAX_WAIT}s"
  exit 1
fi

# Wait for SpringBoard specifically (more reliable than arbitrary sleep)
echo "⏳ Waiting for SpringBoard to be ready..."
SPRINGBOARD_WAIT=0
SPRINGBOARD_MAX=60

while [ $SPRINGBOARD_WAIT -lt $SPRINGBOARD_MAX ]; do
  # Check if SpringBoard is running with timeout protection
  # Use temp file to avoid pipe issues with background jobs
  if run_with_timeout 5 sh -c "xcrun simctl spawn '$UDID' launchctl list 2>/dev/null" > /tmp/launchctl_out_$$ 2>&1; then
    LAUNCHCTL_OUTPUT=$(cat /tmp/launchctl_out_$$ 2>/dev/null || echo "")
    rm -f /tmp/launchctl_out_$$
    
    if echo "$LAUNCHCTL_OUTPUT" | grep -q "com.apple.SpringBoard"; then
      echo "✅ SpringBoard is running after ${SPRINGBOARD_WAIT}s"
      # Give it more time to fully initialize before attempting install
      echo "⏳ Settling for 10s to ensure SpringBoard is fully ready..."
      sleep 10
      break
    fi
  else
    rm -f /tmp/launchctl_out_$$
  fi
  
  sleep 2
  SPRINGBOARD_WAIT=$((SPRINGBOARD_WAIT + 2))
  
  if [ $((SPRINGBOARD_WAIT % 10)) -eq 0 ]; then
    echo "   Waiting for SpringBoard... (${SPRINGBOARD_WAIT}/${SPRINGBOARD_MAX}s)"
  fi
done

if [ $SPRINGBOARD_WAIT -ge $SPRINGBOARD_MAX ]; then
  echo "⚠️  SpringBoard not detected after ${SPRINGBOARD_MAX}s"
  echo "   Proceeding anyway, but install may fail..."
fi

# Install with retries
ATTEMPTS="${RETRIES:-3}"
DELAY="${RETRY_DELAY:-5}"
INSTALL_SUCCESS=false

i=1
while [ "$i" -le "$ATTEMPTS" ]; do
  echo "🔄 Install attempt $i/$ATTEMPTS..."

  echo "🧹 Uninstalling $BID if already installed..."
  # Use timeout wrapper for get_app_container check
  if run_with_timeout 10 xcrun simctl get_app_container "$UDID" "$BID" app >/dev/null 2>&1; then
    echo "   App is installed, uninstalling..."
    if run_with_timeout 60 xcrun simctl uninstall "$UDID" "$BID"; then
      echo "   Uninstalled successfully"
    else
      rc=$?
      if [ "$rc" -eq 124 ]; then
        echo "⚠️  Timed out uninstalling $BID on attempt $i"
      else
        echo "⚠️  Uninstall failed with exit code $rc on attempt $i"
      fi

      if [ "$i" -lt "$ATTEMPTS" ]; then
        echo "🧹 Cooling down ${DELAY}s before retry..."
        sleep "$DELAY"
        i=$((i + 1))
        continue
      else
        echo "❌ Uninstall failed after $ATTEMPTS attempts"
        exit "$rc"
      fi
    fi
  else
    echo "   (not previously installed)"
  fi

  echo "📦 Installing $APP..."
  if run_with_timeout 240 xcrun simctl install "$UDID" "$APP"; then
    echo "   Installed successfully"
    INSTALL_SUCCESS=true
    break
  else
    rc=$?
    if [ "$rc" -eq 124 ]; then
      echo "⚠️  Install timed out after 240s on attempt $i"
    else
      echo "⚠️  Install failed with exit code $rc on attempt $i"
    fi

    # Show simulator state for diagnostics
    echo "📊 Simulator state:"
    xcrun simctl list devices | grep "$UDID" || echo "   Could not retrieve state"

    if [ "$i" -lt "$ATTEMPTS" ]; then
      echo "🧹 Cooling down ${DELAY}s before retry..."
      sleep "$DELAY"
      i=$((i + 1))
    else
      echo "❌ Install failed after $ATTEMPTS attempts"
      exit "$rc"
    fi
  fi
done

if [ "$INSTALL_SUCCESS" = false ]; then
  echo "❌ Install failed after $ATTEMPTS attempts"
  exit 1
fi

echo "🚀 Launching $BID..."
# Launch with a shorter timeout - Maestro will relaunch the app anyway
# If launch fails, it's not critical since Maestro handles app launching
if run_with_timeout 30 xcrun simctl launch "$UDID" "$BID"; then
  echo "   Launched successfully"
  sleep 5
else
  rc=$?
  if [ "$rc" -eq 124 ]; then
    echo "⚠️  Launch timed out after 30s - proceeding anyway (Maestro will launch the app)"
  else
    echo "⚠️  Launch failed with exit code $rc - proceeding anyway (Maestro will launch the app)"
  fi
  # Don't exit - Maestro will handle launching the app
fi

echo "✅ App installed and ready for testing"
