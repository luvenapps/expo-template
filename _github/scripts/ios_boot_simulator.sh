#!/usr/bin/env bash
set -euo pipefail

DEVICE_NAME="${1:-iPhone 17}"

# Find latest available iOS runtime identifier
RUNTIME_ID=$(xcrun simctl list -j runtimes | python3 -c 'import sys,json; r=json.load(sys.stdin).get("runtimes",[]); ios=[rt for rt in r if (rt.get("identifier","")) .startswith("com.apple.CoreSimulator.SimRuntime.iOS") and rt.get("isAvailable", True)]; ios.sort(key=lambda rt: rt.get("version","")); print(ios[-1]["identifier"] if ios else "")')
if [ -z "$RUNTIME_ID" ]; then
  echo "❌ No iOS runtime found"; xcrun simctl list runtimes; exit 1
fi
export DEVICE_NAME RUNTIME_ID

# Try to find an existing device with that name on that runtime
DEVICES_JSON=$(xcrun simctl list -j devices)
EXISTING_UDID=$(printf "%s" "$DEVICES_JSON" | python3 -c 'import sys,json,os;j=json.load(sys.stdin);name=os.environ["DEVICE_NAME"];rt=os.environ["RUNTIME_ID"];print(next((d.get("udid","") for d in j.get("devices",{}).get(rt,[]) if d.get("name")==name),"") )')

if [ -z "$EXISTING_UDID" ]; then
  echo "Creating simulator $DEVICE_NAME ($RUNTIME_ID)..."
  TYPE_ID="com.apple.CoreSimulator.SimDeviceType.$(echo "$DEVICE_NAME" | tr ' ' '-')"
  xcrun simctl create "$DEVICE_NAME" "$TYPE_ID" "$RUNTIME_ID"
  DEVICES_JSON=$(xcrun simctl list -j devices)
  EXISTING_UDID=$(printf "%s" "$DEVICES_JSON" | python3 -c 'import sys,json,os;j=json.load(sys.stdin);name=os.environ["DEVICE_NAME"];rt=os.environ["RUNTIME_ID"];print(next((d.get("udid","") for d in j.get("devices",{}).get(rt,[]) if d.get("name")==name),"") )')
fi

echo "Current device state:"
xcrun simctl list devices | grep -A 2 "$EXISTING_UDID" || true

echo "Shutting down any existing instance..."
xcrun simctl shutdown "$EXISTING_UDID" 2>/dev/null || true

echo "Booting $EXISTING_UDID..."
xcrun simctl boot "$EXISTING_UDID" || true

echo "Waiting for boot to complete..."
xcrun simctl bootstatus "$EXISTING_UDID" -b

echo "✅ Simulator $DEVICE_NAME ($EXISTING_UDID) booted"
xcrun simctl list devices | sed -n '1,120p'