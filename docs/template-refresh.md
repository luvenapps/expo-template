# Refresh and promote the app foundation

`expo-template` is a reusable snapshot of the Luven Apps app foundation. Use the
manual **Prepare template source sync** workflow to propose a refresh from
Betterhabits or a later app that contains reusable improvements.

## Configure the workflow

Add an Actions secret named `SOURCE_REPO_TOKEN` to `expo-template`. Use a
fine-grained personal access token with **Contents: Read-only** access to the
private source repository. When promoting a different private app, add that
repository to the token's allowed repositories. The workflow's `GITHUB_TOKEN`
is read-only. Add a second Actions secret named `TEMPLATE_AUTOMATION_TOKEN`,
scoped to `expo-template` with **Contents: Read and write** and **Pull requests:
Read and write**. The workflow uses this token to update the sync branch and
open a PR. Using a repository-scoped token also lets GitHub start the normal PR
checks for the generated update.

## Prepare a refresh

1. Make sure the source branch contains the intended base app and has no
   in-progress product work that should stay out of the template.
2. In `expo-template`, run **Actions → Prepare template source sync → Run
   workflow**. Choose the source repository and branch. The destination is
   always `expo-template` `main`.
3. Review the generated PR. Check app identity, package and lock
   file changes, source deletions, hidden-file copies, and product-specific
   material. The sync keeps template-owned identity/bootstrap files, maps source
   `AGENTS.md` and `CLAUDE.md` to `_AGENTS.md` and `_CLAUDE.md`, and maps
   `.github`, `.husky`, `.maestro`, and selected root dotfiles to underscore
   paths. Postinstall materializes the source guidance in the generated app.
   Sync excludes `credentials/`, runner registration scripts, and Betterhabits
   planning documents. The template keeps its own `.env.example` with fake
   Firebase base64 config. Postinstall adapts the fake config to the generated
   app's bundle ID/package name; the native plugin creates missing credential
   files from those environment variables during builds.
4. Wait for the PR's normal CI. Before merging, create a fresh app from the
   updated template and verify bootstrap, local setup, and the platform you
   intend to build.
5. Merge the PR only after the diff and checks are acceptable.

Repeated runs update the same `automation/template-source-sync` PR so the diff
stays reviewable. They never change `main` directly.

## Promote a later app

When a new app has reusable improvements, run the same workflow with that
repository and branch as the source. Review the proposed changes against the
template's reusable foundation; keep product features, app-specific branding,
and generated environment state in the app unless they are intentionally being
generalized. Credentials are excluded from sync. The new app remains independent,
and the resulting PR still targets `expo-template` `main`.

## Validate a generated app

From a clean clone created from the template:

```bash
npm ci
npm run type-check
npm run lint
npm test -- --runInBand
npx expo install --check
```

For local runtime checks, run `npm run setup:local`, then keep
`npm run supabase:dev` running in one terminal while starting the app with
`npm start` in another. Configure Supabase before testing authenticated sync.

For local scaffold testing, copy `.env.example` to `.env.local` if missing
(`setup.sh` already does this). The fake Firebase values support native builds
with Firebase disabled at runtime. Use real Firebase configuration when testing
Firebase services. Existing local environment and credential files take precedence.
Native builds also require the matching local Xcode/Android SDK setup and Apple
signing configuration when shipping to Apple platforms.
