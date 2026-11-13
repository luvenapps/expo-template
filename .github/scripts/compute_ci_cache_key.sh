#!/usr/bin/env bash
# Cache complete release artifacts, including their embedded JavaScript.
set -euo pipefail
PLATFORM="${1:?platform required}"
case "$PLATFORM" in ios|android) ;; *) echo 'Expected ios or android' >&2; exit 1 ;; esac
SOURCE_TREE=$(git -C "${GITHUB_WORKSPACE:?}" rev-parse 'HEAD^{tree}')
export SOURCE_TREE PLATFORM
# Do not fingerprint the scaffold: bootstrap-generated files can vary per run.
# Hash build inputs without printing environment values or credentials.
DIGEST=$(python3 - <<'PY'
import hashlib, json, os
names = [
    'SOURCE_TREE', 'PLATFORM', 'RUNNER_OS', 'RUNNER_ARCH', 'ImageOS', 'ImageVersion',
    'CREATE_EXPO_APP_VERSION', 'EAS_CLI_VERSION', 'FASTLANE_VERSION',
    'EAS_PROJECT_ID', 'EAS_PROJECT_SLUG',
    'GOOGLE_SERVICE_INFO_PLIST_B64', 'GOOGLE_SERVICES_JSON_B64',
]
values = {name: os.environ.get(name, '') for name in names}
values.update({key: value for key, value in os.environ.items() if key.startswith('EXPO_PUBLIC_')})
print(hashlib.sha256(json.dumps(values, sort_keys=True).encode()).hexdigest())
PY
)
printf 'key=template-release-v1-%s-%s\n' "$PLATFORM" "$DIGEST"
