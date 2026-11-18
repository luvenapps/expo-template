# Refresh and promote the app template

The generated Expo app lives entirely in template-sync/. The root contains the
expo-template repository's own documentation, sync tooling, CI, credentials, and
maintenance package. Create Expo App uses the template-sync/ GitHub subdirectory
as the generated app root.

## Configure the workflow

Add an Actions secret named SOURCE_REPO_TOKEN to expo-template. Use a
fine-grained personal access token with Contents: Read-only access to the
selected private source repository. When promoting another private app, allow
that repository in the token.

Add TEMPLATE_AUTOMATION_TOKEN to expo-template with Contents and Pull requests
read/write access. The workflow uses this token to push its sync branch and open
a PR. The workflow's GITHUB_TOKEN remains read-only.

## Prepare a refresh

1. Make sure the selected source branch contains the reusable app foundation
   and no product work that should stay out of the template.
2. In expo-template, run Actions → Prepare template source sync → Run workflow.
   Choose the source repository and branch. The destination is expo-template
   main.
3. Review the PR. Sync updates and removes files only inside template-sync/.
   The root README, guidance, CI, maintenance package, credentials.json, and
   repository configuration stay template-owned. The source app's assets/ are
   included. credentials.json and credential directories are excluded.
4. Review app identity, package and lockfile changes, workflow changes,
   deletions, credentials, and hidden-file materialization. Source AGENTS.md and
   CLAUDE.md become _AGENTS.md and _CLAUDE.md. Source .github, .husky, and
   .maestro become underscore paths inside template-sync/; postinstall
   materializes them in the generated app. The app .env.example, LICENSE, and
   scripts/postinstall.mjs remain template-owned inside template-sync/.
5. Wait for normal CI. Before merging, create a fresh generated app and verify
   bootstrap, local setup, and the platform you intend to build.

## Preview locally

```sh
node scripts/sync-template-source.mjs --source-dir <source-checkout> --target-dir <template-checkout> --dry-run
```

The script fetches the selected source ref, creates a temporary detached
worktree at that commit, and compares tracked files with freshly fetched
expo-template main. Use --source-branch <branch-or-tag> to select another source
ref. Local source branches and edits are preserved; ignored files are excluded.
The temporary source worktree is removed after completion, cancellation, or
failure.

The preview shows the planned updates and removals. The target must be clean
before apply mode. After confirmation, the script creates a timestamped sync
branch from template main, commits the selected changes, pushes it, and opens a
PR. The script needs gh authentication. Actions supplies --yes to skip the
terminal prompt. Unchanged source commits and snapshots that do not affect
managed app files create no branch or PR.

The source baseline is recorded at
template-sync/.template-sync-manifest.json. It is removed by app postinstall
after Create Expo App has extracted the subdirectory.

## Package managers

The source app's single lockfile is synced with its package.json. Generated-app
CI selects the manager from the generated app directory and supports
package-lock.json with npm or pnpm-lock.yaml with pnpm. Both lockfiles or no
supported lockfile fail. The pnpm version used by the template repository's
workflows is pinned in .mise.ci.toml. The root maintenance package uses its
separate npm package-lock.json.

## Validate a generated app

Create a fresh app from the repo subdirectory:

```sh
npx create-expo-app my-app --template https://github.com/luvenapps/expo-template/tree/main/template-sync
```

From my-app, install with the one manager matching the app lockfile:

```sh
npm ci
```

or:

```sh
pnpm install --frozen-lockfile
```

Then run the corresponding app scripts, including type-check, lint, test, and
Expo dependency alignment. The root repository's iOS, Android, and quality
workflows perform these generated-app checks automatically.

For local runtime checks, run the app's setup:local command, then keep
supabase:dev running in one terminal while starting the app in another.
Configure Supabase before testing authenticated sync. Native builds also need
the matching local Xcode or Android SDK setup and Apple signing configuration
when shipping to Apple platforms.
