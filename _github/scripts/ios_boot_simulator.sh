#!/bin/bash
set -e

DEVICE="${IOS_DEVICE:-}"
ATTEMPTS="${RETRIES:-2}"
DELAY="${RETRY_DELAY:-2}"
UDID_FILE=".simulator_udid"

# Remove stale UDID reference from previous runs
rm -f "$UDID_FILE"

# Timeout wrapper for macOS (no GNU timeout available)
run_with_timeout() {
  local timeout="$1"
  shift
  local command=("$@")

  "${command[@]}" &
  local cmd_pid=$!
  local start_time
  start_time=$(date +%s)

  while kill -0 "$cmd_pid" 2>/dev/null; do
    local now
    now=$(date +%s)
    if [ $((now - start_time)) -ge "$timeout" ]; then
      kill -TERM "$cmd_pid" 2>/dev/null || true
      sleep 1
      kill -KILL "$cmd_pid" 2>/dev/null || true
      wait "$cmd_pid" 2>/dev/null || true
      return 124
    fi
    sleep 0.5
  done

  local exit_code=0
  if ! wait "$cmd_pid"; then
    exit_code=$?
  fi
  return "$exit_code"
}

# Function to extract UDID using jq (more reliable than grep)
get_udid_for_device() {
  local device_name="$1"
  xcrun simctl list devices available --json | \
    jq -r ".devices[] | .[] | select(.name==\"$device_name\") | .udid" | \
    head -1
}

# Function to get first available iPhone UDID
get_first_iphone_udid() {
  xcrun simctl list devices available --json | \
    jq -r '.devices[] | .[] | select(.name | startswith("iPhone")) | .udid' | \
    head -1
}

# Function to wait for shutdown with timeout
wait_for_shutdown() {
  local udid="$1"
  local max_wait=30
  local waited=0
  
  echo "⏳ Waiting for simulator to shutdown..."
  while [ $waited -lt $max_wait ]; do
    state="$(xcrun simctl list devices | grep "$udid" | awk '{print $NF}' | tr -d '()' || echo 'Unknown')"
    
    if [ "$state" = "Shutdown" ]; then
      echo "✅ Simulator shutdown complete after ${waited}s"
      return 0
    fi
    
    if [ $((waited % 5)) -eq 0 ] && [ $waited -gt 0 ]; then
      echo "   Still shutting down... ${waited}s (state: $state)"
    fi
    
    sleep 1
    waited=$((waited + 1))
  done
  
  echo "⚠️  Timeout waiting for shutdown, forcing..."
  return 1
}

# Try to resolve UDID for requested device (if any)
UDID=""
if [ -n "$DEVICE" ]; then
  echo "🔍 Looking for device: $DEVICE"
  UDID="$(get_udid_for_device "$DEVICE")"
  if [ -n "$UDID" ]; then
    echo "✅ Found: $DEVICE ($UDID)"
  else
    echo "⚠️  Device '$DEVICE' not found"
  fi
fi

# Fallback to first available iPhone if not found
if [ -z "$UDID" ]; then
  echo "ℹ️  Using first available iPhone..."
  DEVICE="$(xcrun simctl list devices available --json | \
    jq -r '.devices[] | .[] | select(.name | startswith("iPhone")) | .name' | \
    head -1)"
  UDID="$(get_first_iphone_udid)"
fi

if [ -z "$UDID" ]; then
  echo "❌ No available iPhone simulators found"
  echo "Available devices:"
  xcrun simctl list devices available
  exit 1
fi

echo "ℹ️  Selected device: $DEVICE ($UDID)"

# CRITICAL: Always shutdown any existing simulator state first
echo "🧹 Cleaning up any existing simulator state..."
xcrun simctl shutdown "$UDID" 2>&1 || echo "   (shutdown command completed)"

# Wait for actual shutdown before proceeding
if ! wait_for_shutdown "$UDID"; then
  # Force kill if normal shutdown failed
  echo "🔨 Force killing Simulator processes..."
  killall -9 Simulator 2>/dev/null || true
  sleep 3
  
  # Check state again
  state="$(xcrun simctl list devices | grep "$UDID" | awk '{print $NF}' | tr -d '()' || echo 'Unknown')"
  if [ "$state" != "Shutdown" ]; then
    echo "⚠️  Warning: Simulator state is '$state', proceeding anyway..."
  fi
fi

# Kill any lingering Simulator processes
killall Simulator 2>/dev/null || echo "   (no Simulator processes to kill)"
sleep 1

# Open Simulator app fresh
echo "📱 Opening Simulator... ($(date +%H:%M:%S))"
open -a Simulator
echo "✓ Simulator.app launch command completed ($(date +%H:%M:%S))"

# Give Simulator.app time to launch
echo "⏳ Waiting 5s for Simulator.app to initialize..."
sleep 5
echo "✓ Ready to boot ($(date +%H:%M:%S))"

boot_and_wait() {
  local udid="$1"
  
  echo "🔄 Booting simulator..."
  if ! xcrun simctl boot "$udid" 2>&1; then
    echo "❌ Boot command failed"
    return 1
  fi
  
  echo "⏳ Waiting for simulator to reach 'Booted' state..."
  local wait_time=0
  local max_wait=180
  
  while [ $wait_time -lt $max_wait ]; do
    state="$(xcrun simctl list devices | grep "$udid" | awk '{print $NF}' | tr -d '()')"
    
    if [ "$state" = "Booted" ]; then
      echo "✅ Simulator state is 'Booted' after ${wait_time}s"
      
      # CRITICAL: Verify responsiveness using timeout wrapper (no GNU timeout on macOS)
      echo "⏳ Verifying simulator responsiveness..."
      local verify_time=0
      local verify_max=60
      
      while [ $verify_time -lt $verify_max ]; do
        # Test if we can spawn a simple process with timeout protection
        if run_with_timeout 5 xcrun simctl spawn "$udid" launchctl print system >/dev/null 2>&1; then
          echo "✅ Simulator is responsive after ${verify_time}s verification"
          
          # Wait for SpringBoard specifically
          echo "⏳ Checking for SpringBoard..."
          local sb_time=0
          local sb_max=30
          
          while [ $sb_time -lt $sb_max ]; do
            if run_with_timeout 5 xcrun simctl spawn "$udid" launchctl list 2>/dev/null | grep -q "com.apple.SpringBoard"; then
              echo "✅ SpringBoard is running"
              sleep 3  # Brief settle time
              return 0
            fi
            sleep 2
            sb_time=$((sb_time + 2))
          done
          
          echo "⚠️  SpringBoard not detected but simulator is responsive, proceeding..."
          return 0
        fi
        
        sleep 2
        verify_time=$((verify_time + 2))
        
        if [ $((verify_time % 10)) -eq 0 ]; then
          echo "   Still verifying... (${verify_time}/${verify_max}s)"
        fi
      done
      
      echo "❌ Simulator reached 'Booted' state but failed responsiveness checks"
      return 1
    fi
    
    # Only print every 10 seconds to reduce log spam
    if [ $((wait_time % 10)) -eq 0 ] && [ $wait_time -gt 0 ]; then
      echo "   Waiting for boot... ${wait_time}s (state: $state)"
    fi
    
    sleep 1
    wait_time=$((wait_time + 1))
  done
  
  echo "❌ Timeout waiting for 'Booted' state after ${max_wait}s"
  return 1
}

# Boot with retries
for attempt in $(seq 1 "$ATTEMPTS"); do
  echo ""
  echo "🔄 Boot attempt $attempt/$ATTEMPTS for $DEVICE ($UDID)..."
  
  if boot_and_wait "$UDID"; then
    echo ""
    echo "✅ SUCCESS: Simulator $DEVICE ($UDID) is fully booted and responsive"
    echo "💾 Writing UDID to $UDID_FILE in $(pwd)"
    echo "$UDID" > "$UDID_FILE"
    ls -la "$UDID_FILE" || echo "⚠️  Failed to create UDID file"
    exit 0
  fi
  
  if [ "$attempt" -lt "$ATTEMPTS" ]; then
    echo "🧹 Hard reset - shutting down and erasing..."
    xcrun simctl shutdown "$UDID" 2>&1 || true
    
    # Wait for clean shutdown before erasing
    if ! wait_for_shutdown "$UDID"; then
      killall -9 Simulator 2>/dev/null || true
      sleep 3
    fi
    
    # Erase only after confirmed shutdown
    echo "🧹 Erasing simulator..."
    xcrun simctl erase "$UDID" 2>&1 || true
    sleep 2
    
    killall Simulator 2>/dev/null || true
    sleep 2
    
    echo "⏱️  Waiting ${DELAY}s before retry..."
    sleep "$DELAY"
    
    # Reopen simulator for next attempt
    open -a Simulator
    sleep 3
  fi
done

echo ""
echo "❌ FAILED: Could not boot $DEVICE ($UDID) after $ATTEMPTS attempts"
exit 1
