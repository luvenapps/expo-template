# Expo Template Repository

## Purpose and ownership

This repository is a scaffold source, not an app checkout. Keep the root
`AGENTS.md`, `CLAUDE.md`, bootstrap, and template sync tooling template-owned.
Keep `CLAUDE.md` as only `@AGENTS.md`. Validate app behavior in a newly generated
app, not in this worktree.

## Template refresh

- Follow [the template refresh guide](docs/template-refresh.md) for workflow
  setup, credentials, local previews, sync scope, review steps, and generated-app
  validation.
- For a local preview, run
  `node scripts/sync-template-source.mjs --source-dir <source-checkout> --target-dir <template-checkout> --dry-run`.
  The script previews updates and removals; the guide covers apply mode and its
  effects.

## File ownership

- This is a scaffold source, not the source of truth for app files. Do not edit
  source-managed paths here: sync can overwrite or remove them. Make those
  changes in the selected source app, then sync.
- Before editing a potentially synced path, check `MANAGED_ROOTS`,
  `MANAGED_ROOT_FILES`, `outputPaths()`, `isManagedSourcePath()`, `TEMPLATE_ONLY`,
  and `EXCLUDED_*` in `scripts/sync-template-source.mjs`. Sync recursively copies
  eligible files under `app/`, `src/`, `__tests__/`, `__mocks__/`, `plugins/`,
  `public/`, `supabase/`, `scripts/`, `docs/`, and `eslint-rules/`, plus managed
  root files such as `README.md`, `package.json`, and app configuration.
- `TEMPLATE_ONLY` paths and root paths outside the managed source set are
  template-owned, subject to their own instructions. Excluded paths may be
  generated, local, or credential data; exclusion alone does not grant edit
  permission. Content transformations do not change path ownership.
- Source `.github/`, `.husky/`, and `.maestro/` map to underscore mirrors. Do not
  edit these generated mirrors directly: `_github/`, `_husky/`, `_maestro/`,
  `_AGENTS.md`, `_CLAUDE.md`, `_gitignore`, `_mise.toml`, `_prettierignore`,
  `_prettierrc.json`, and `_renovate.json`. Postinstall materializes them in the
  generated app; make source-owned changes in the source app and sync them.
- The root `AGENTS.md` and `CLAUDE.md` are template-owned. Source guidance is
  copied to `_AGENTS.md` and `_CLAUDE.md`; keep root `CLAUDE.md` as only
  `@AGENTS.md`.
- Managed paths are updated as a snapshot, so source deletions can remove files.
  Review deletions and product-specific code in every sync PR.
- Source workflows are copied with their settings. Make reusable workflow
  changes in the source app; add a sync transformation only when every sync
  should apply it. Keep template-only CI changes in root `.github/`, not
  `_github/`.
- `credentials/` is excluded. Never commit real credentials, local environment
  files, or private signing material.

## Review and validation

- Use Conventional Commit-style PR titles: `<type>: <short description>`.
- Choose a source branch with the intended reusable foundation and no unfinished
  product work.
- Before merging, review package and lockfile changes, app identity, deletions,
  workflow changes, credentials, and generated underscore-file materialization.
- Do not install app dependencies or run app formatting, lint, or tests in this
  template worktree. Validate app behavior through generated-app CI and a fresh
  generated app when requested.

## CI changes

- These instructions apply when changing template CI. The workflows in root
  `.github/workflows/ci-ios.yml` and `ci-android.yml` validate scaffolded apps;
  `_github/` contains workflows shipped to generated apps.
- For workflow and runner policy, see [the GitHub Actions guide](docs/GITHUBACTIONS.md).
  For CI helper changes, validate in a generated app with
  `node --check <changed-file.mjs>`, workflow YAML parsing, and
  `npm test -- --runInBand __tests__/scripts`. Hosted runner and simulator
  compatibility require a GitHub Actions run.
