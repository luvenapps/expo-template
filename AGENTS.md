# Expo Template Repository

## Purpose

This repository is a scaffold source, not an app checkout. Keep its root
`AGENTS.md`, `CLAUDE.md`, bootstrap, and sync tooling template-owned. Validate app
behavior in a newly generated app, not in this worktree.

## Refresh from an app

- Use **Actions → Prepare template source sync → Run workflow** in `expo-template`.
  Select a source repository and branch. Defaults are `luvenapps/betterhabits`
  and `main`; the workflow always proposes changes against `expo-template` `main`.
- The workflow needs `SOURCE_REPO_TOKEN` with source Contents read access and
  `TEMPLATE_AUTOMATION_TOKEN` with Contents and Pull requests write access to
  `expo-template`.
- Each run creates a PR from a new branch named
  `automation/template-source-sync-YYYYMMDD-HHMMSSZ` using UTC time; it does not
  update `main` directly. Review and merge each PR manually.
- The PR body lists source commit subjects since the last merged sync for that
  repository and branch; `.template-sync-manifest.json` tracks those source SHAs.
- For a local preview, run
  `node scripts/sync-template-source.mjs --source-dir <source-checkout> --target-dir <template-checkout> --dry-run`.
  It fetches source `main` (or `--source-branch`) from origin into a temporary
  detached worktree, compares tracked files with freshly fetched template `main`, and
  previews updates/removals and the PR description. Without `--dry-run`, it asks
  for confirmation, then creates a timestamped branch, commits, pushes, and
  opens a PR. CI calls the same script with `--yes`. Both directories must exist;
  an applying run requires a clean target and authenticated `gh`. The temporary
  source worktree is removed after success, cancellation, or failure; the source
  checkout’s branch and local edits are preserved.
- If the recorded source SHA is unchanged, or no managed files differ, the
  script reports nothing to update and creates no branch or PR. The manifest
  advances only in a sync PR containing file changes. No historical SHA is
  assumed when a source has no recorded baseline.

## What sync copies

- `README.md` comes from the source app. The sync script adapts its app identity
  and scaffold setup; postinstall fills its generated app placeholders.
- The script copies eligible source files recursively; it is not a hand-maintained
  per-file allowlist. Its exclusions and transformations are in
  `scripts/sync-template-source.mjs`.
- Managed source paths are updated as a snapshot, so source deletions can remove
  files from managed template paths. Review deletions and product-specific code
  in every sync PR.
- The template keeps its own root `AGENTS.md` and `CLAUDE.md`. Source root guidance
  is copied to `_AGENTS.md` and `_CLAUDE.md`; postinstall replaces those with the
  generated app's root instructions and fills app identity tokens. Keep
  `CLAUDE.md` as only `@AGENTS.md`.
- `.github`, `.husky`, and `.maestro` map to `_github`, `_husky`, and `_maestro`.
  Selected dotfiles also get underscore copies so postinstall can materialize
  them after scaffolding.
- Source workflows are copied with their settings unless the sync script has an
  explicit transformation. Generalize source-owned values in the source app
  first; do not add one-off workflow rewrites here.
- `credentials/` is excluded from sync. The template-owned `.env.example` holds
  fake Firebase base64 config for scaffold testing; postinstall adjusts its app
  IDs. The native plugin decodes it into missing credential files during builds.
  `setup.sh` copies `.env.example` to `.env.local` when missing. Never commit real
  credentials, local environment files, or private signing material.

## Review and validation

- Use Commitizen-style titles for every pull request: `<type>: <short description>`
  (for example, `feat: timestamp template sync branches`).
- Choose a source branch that contains the intended reusable app foundation and
  no unfinished product work.
- Review package and lockfile changes, app identity, deletions, workflow changes,
  credentials, and underscore-file materialization before merging.
- Do not install app dependencies or run formatting, lint, or tests in this
  template worktree. Validate through the generated-app CI and a fresh generated
  app when requested.

## Template CI

- `.github/workflows/ci-ios.yml` and `ci-android.yml` validate a scaffolded app on hosted runners; `_github/` contains the workflows shipped to generated apps. Keep template-only CI changes in `.github/`.
- Mobile CI uses `latest` hosted runner labels. `.mise.ci.toml` centralizes CLI version policy (`MISE_ENV=ci`); Maestro/Fastlane retain their existing pins, while create-expo-app/EAS resolve `latest` before computing artifact cache keys. CI installs the checked-in lockfile using `npm ci`. Dependency alignment uses the installed SDK map (`EXPO_OFFLINE=1 expo install --check`), so remote patch recommendations do not change rerun behavior. Release artifact cache keys include the complete source tree, runner image, tool versions, and local build environment inputs.
- iOS template CI builds only the ARM64 simulator architecture, using a generated-app hook after pod installation; CI mise settings prefer prebuilt Ruby without adding environment variables.
- iOS builds and tests run on separate macOS runners. Startup, install, and Maestro commands have bounded deadlines; tests select the recorded simulator UDID.
- Android CI builds only the x86_64 emulator ABI and caches a clean AVD snapshot. Production and generated-app build profiles retain their existing architectures.
- Validate CI shell changes with `bash -n`, workflow YAML parsing, and `npm test -- --runInBand __tests__/scripts` (also included automatically in the unit suite and Quality CI). Hosted performance and simulator compatibility require a GitHub Actions run; compare a cold run with a rerun of the same commit to verify artifact-cache reuse.
