#!/usr/bin/env bash
set -euo pipefail

# Accept as args or from env (HOSTED_RESULT / SELFHOSTED_RESULT)
HOSTED="${1:-${HOSTED_RESULT:-}}"
SELF="${2:-${SELFHOSTED_RESULT:-}}"

echo "Hosted result: ${HOSTED:-unset}"
echo "Self-hosted result: ${SELF:-unset}"

if [[ "${HOSTED:-}" == "success" ]]; then
  echo "✅ Using hosted result: success"
  exit 0
fi

if [[ "${SELF:-}" == "success" ]]; then
  echo "✅ Hosted did not succeed, but self-hosted succeeded. Marking workflow success."
  exit 0
fi

echo "❌ Both hosted and self-hosted did not succeed (hosted=${HOSTED:-unset}, self-hosted=${SELF:-unset})."
exit 1