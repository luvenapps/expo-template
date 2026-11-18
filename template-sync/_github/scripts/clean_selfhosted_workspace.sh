#!/usr/bin/env bash
set -euo pipefail

# Conservative, workspace-scoped cleanup to avoid cross-repo deletion on self-hosted runners.
# Optional extras can be enabled via env flags (see below).
#
# Env flags (optional):
#   CLEAN_GLOBAL_GRADLE=1       -> also remove ~/.gradle/caches and ~/.gradle/wrapper
#   CLEAN_DERIVEDDATA=1         -> remove Xcode DerivedData entries (scoped to this project name if possible)
#   CLEAN_WATCHMAN=1            -> watchman watch-del-all (if installed)
#   CLEAN_NPM_CACHE=1           -> npm cache verify & clean (best-effort)

WORKSPACE="${GITHUB_WORKSPACE:-$(pwd)}"
cd "$WORKSPACE"

say() { echo -e "[clean] $*"; }

action() {
  local path="$1"
  if [[ -e "$path" ]]; then
    say "rm -rf $path"
    rm -rf "$path"
  else
    say "skip (missing): $path"
  fi
}

say "Workspace: $WORKSPACE"

# 1) App & build outputs (workspace)
action "node_modules"

# Archive e2e-artifacts with timestamp and keep only last 4
if [[ -d "e2e-artifacts" ]]; then
  TIMESTAMP=$(date +%Y%m%d-%H%M%S)
  say "archiving e2e-artifacts -> e2e-artifacts-$TIMESTAMP"
  mv "e2e-artifacts" "e2e-artifacts-$TIMESTAMP"

  # Keep only last 4 archived folders (delete older ones)
  say "cleaning old e2e-artifacts archives (keeping last 4)"
  ls -dt e2e-artifacts-* 2>/dev/null | tail -n +5 | xargs rm -rf || true
else
  say "skip (missing): e2e-artifacts"
fi

# Android project artifacts (workspace)
# Android app build: clean heavy outputs but keep reports for postmortem
if [[ -d "android/app/build" ]]; then
  say "clean android/app/build (preserve reports)"
  rm -rf \
    android/app/build/intermediates \
    android/app/build/outputs \
    android/app/build/tmp \
    android/app/build/generated \
    android/app/build/transforms || true
else
  say "skip (missing): android/app/build"
fi
action "android/.gradle"

# iOS project artifacts (workspace)
if [[ -d "ios/build" ]]; then
  say "clean ios/build (preserve xcresult and logs)"
  rm -rf \
    ios/build/Build/Intermediates.noindex \
    ios/build/Build/Products \
    ios/build/Build/GeneratedSources \
    ios/build/Build/Index.noindex \
    ios/build/Build/PrecompiledHeaders || true
else
  say "skip (missing): ios/build"
fi

# Metro caches (workspace & TMPDIR)
action "node_modules/.cache/metro"
if [[ -n "${TMPDIR:-}" ]]; then
  say "rm -rf $TMPDIR/metro-*"
  rm -rf "$TMPDIR"/metro-* || true
fi

# 2) Optional: global Gradle caches (useful if they get corrupted on self-hosted)
if [[ "${CLEAN_GLOBAL_GRADLE:-0}" == "1" ]]; then
  action "$HOME/.gradle/caches"
  action "$HOME/.gradle/wrapper"
fi

# 3) Optional: Xcode DerivedData (scoped if possible)
if [[ "${CLEAN_DERIVEDDATA:-0}" == "1" ]]; then
  DERIVED="$HOME/Library/Developer/Xcode/DerivedData"
  if [[ -d "$DERIVED" ]]; then
    # Try to scope to current project name if we can infer it
    PROJ="$(basename "$WORKSPACE")"
    say "Scanning DerivedData for project: $PROJ"
    if compgen -G "$DERIVED/*$PROJ*" > /dev/null; then
      for d in "$DERIVED"/*"$PROJ"*; do
        action "$d"
      done
    else
      say "No project-scoped DerivedData found; set CLEAN_DERIVEDDATA=all to remove all"
      if [[ "${CLEAN_DERIVEDDATA}" == "all" ]]; then
        action "$DERIVED"
      fi
    fi
  else
    say "skip (missing): $DERIVED"
  fi
fi

# 4) Optional: Watchman
if [[ "${CLEAN_WATCHMAN:-0}" == "1" ]]; then
  if command -v watchman >/dev/null 2>&1; then
    say "watchman watch-del-all"
    watchman watch-del-all || true
  else
    say "watchman not installed, skipping"
  fi
fi

# 5) Optional: npm cache maintenance
if [[ "${CLEAN_NPM_CACHE:-0}" == "1" ]]; then
  if command -v npm >/dev/null 2>&1; then
    say "npm cache verify"
    npm cache verify || true
    say "npm cache clean --force"
    npm cache clean --force || true
  fi
fi

say "Done."
