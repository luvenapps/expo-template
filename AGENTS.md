# Expo Template Repository

## Purpose and ownership

This repository packages a complete Expo app from template-sync/ and maintains
the template repository itself. Create Expo App selects the template-sync/
GitHub subdirectory as the generated app root.

The source sync helper updates and removes paths only under template-sync/.
Everything at the repository root belongs to expo-template maintenance: root
guidance, README, credentials.json, package/tooling configuration, sync tooling,
tests, and .github workflows.

## Template refresh

Follow docs/template-refresh.md for setup, source selection, local previews,
sync review, and generated-app validation. Preview with:

```sh
node scripts/sync-template-source.mjs --source-dir <source-checkout> --target-dir <template-checkout> --dry-run
```

The sync manifest lives at template-sync/.template-sync-manifest.json. The
source app's assets/ directory is included. credentials.json and credential
directories remain outside template-sync and are excluded from source sync.

## File ownership

- Make reusable app changes in the selected source app, then propose them through
  the source sync workflow. Do not edit app payload files under template-sync/
  directly unless the change is template-owned.
- Keep root .github workflows and scripts template-owned. The source app's
  workflows, scripts, app configs, package files, assets, and app docs sync under
  template-sync/.
- template-sync/commitlint.config.js belongs to generated apps. The root
  commitlint.config.js belongs to commits in expo-template.
- template-sync/scripts/postinstall.mjs runs in a generated app. It fills
  identity placeholders, materializes underscore placeholders, applies initial
  database migrations, removes the sync manifest, and then removes itself.
- credentials.json stays at the repository root and must never be copied into
  template-sync/. The sync helper excludes that filename wherever it appears.
- Review sync PRs for app identity changes, package and lockfile updates,
  workflow changes, deletions, credentials, and hidden-file materialization.

## Package managers and CI

The root maintenance package uses pnpm and its own pnpm-lock.yaml. Generated
app CI selects the package manager from the generated app directory. It supports
exactly one of package-lock.json or pnpm-lock.yaml. Both or neither is an error.
The root .mise.toml pins pnpm for local maintenance; .mise.ci.toml pins the
pnpm version used by template CI.

Root tooling checks:

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm type-check
pnpm test --runInBand
```

The root Jest suite covers sync behavior and CI helpers. Generated-app behavior
is checked by the root workflows after they create an app from template-sync/.
Do not install the app's dependencies or run app lint, formatting, or tests in
the repository root.

## Guidance

Keep CLAUDE.md as only @AGENTS.md. Update this document when repository
ownership, structure, root tooling, or CI behavior changes. Use Conventional
Commit titles for commits and PRs. Do not push or open a PR unless requested.
