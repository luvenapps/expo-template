#!/usr/bin/env bash
set -euo pipefail

EVENT_NAME="${1:-}"
PR_NUMBER="${2:-}"
EAS_CLI_VERSION="${EAS_CLI_VERSION:-}"

if [ -z "$EVENT_NAME" ]; then
  echo "Usage: $0 <event_name> [pr_number]" >&2
  exit 1
fi

if [ -z "$EAS_CLI_VERSION" ]; then
  echo "EAS_CLI_VERSION environment variable is required." >&2
  exit 1
fi

npx expo export --platform web --clear >&2

DEPLOY_ARGS=(deploy --non-interactive)
if [ "$EVENT_NAME" = "pull_request" ]; then
  if [ -z "$PR_NUMBER" ]; then
    echo "PR number is required for pull_request events." >&2
    exit 1
  fi
  DEPLOY_ARGS+=(--alias "pr-${PR_NUMBER}")
else
  DEPLOY_ARGS+=(--prod)
fi

LOG_FILE="$(mktemp)"

if ! npx "eas-cli@${EAS_CLI_VERSION}" "${DEPLOY_ARGS[@]}" >"$LOG_FILE" 2>&1; then
  cat "$LOG_FILE" >&2
  rm -f "$LOG_FILE"
  exit 1
fi

cat "$LOG_FILE" >&2

DEPLOYMENT_URL=$(awk '/^Deployment URL[[:space:]]+/ { print $NF; exit }' "$LOG_FILE")
if [ "$EVENT_NAME" = "pull_request" ]; then
  DEPLOY_URL=$(awk '/^Alias URL[[:space:]]+/ { print $NF; exit }' "$LOG_FILE")
else
  DEPLOY_URL="$DEPLOYMENT_URL"
  if [ -z "$DEPLOY_URL" ]; then
    DEPLOY_URL=$(awk '/^Alias URL[[:space:]]+/ { print $NF; exit }' "$LOG_FILE")
  fi
fi

rm -f "$LOG_FILE"

printf '%s\n' "$DEPLOY_URL"
printf '%s\n' "$DEPLOYMENT_URL"
