#!/bin/bash
set -euo pipefail

ATTEMPTS="${RETRIES:-2}"
DELAY="${RETRY_DELAY:-2}"

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
source "$SCRIPT_DIR/with_timeout.sh"
UDID=$(tr -d '[:space:]' < .simulator_udid)
test -n "$UDID"
mkdir -p e2e-artifacts

for i in $(seq 1 "$ATTEMPTS"); do
  echo "🧪 E2E attempt $i/$ATTEMPTS..."
  OUT="e2e-artifacts/attempt-$i"
  mkdir -p "$OUT"

  set +e
  run_with_timeout 240 maestro --device "$UDID" test .maestro/flows/smoke.ios.yaml --test-output-dir "$OUT" > "$OUT/maestro.log" 2>&1
  CODE=$?
  set -e
  cat "$OUT/maestro.log"

  if [ "$CODE" -eq 0 ]; then
    echo "✅ E2E passed on attempt $i"
    echo "0" > e2e-artifacts/EXITCODE
    rm -f e2e-artifacts/latest && ln -s "attempt-$i" e2e-artifacts/latest
    exit 0
  fi

  echo "❌ E2E attempt $i failed (exit code: $CODE)"
  [ "$i" -lt "$ATTEMPTS" ] && { echo "⏳ Retrying in ${DELAY}s..."; sleep "$DELAY"; }
done

echo "$ATTEMPTS" > e2e-artifacts/EXITCODE
exit 1
