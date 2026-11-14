# Agent instructions

## Repository conventions

- Use TypeScript, existing patterns, and `@/…` imports where configured.
- Use npm and the Node/Java versions in `.mise.toml`; prefer `mise` for runtimes.
  Use `npm ci` for existing dependencies and keep `package-lock.json` in sync when
  changing dependencies. Read `package.json` for current versions and commands.
- Tamagui compiler options live in `tamagui.build.ts`; restart Metro with `npm start -- --clear` after config changes. Generate icons with `mise exec -- ./node_modules/.bin/tamagui icons add IconName --out src/ui/icons` and import from `@/ui/icons`.
- Expo generates `ios/` and `android/`. Make native configuration changes through
  Expo config/plugins unless custom native code is explicitly required.
- Keep running development servers available for manual testing. Do not kill
  unrelated processes or clear shared caches as a routine troubleshooting step.
- Never commit credentials or local environment files. Verify current environment
  loading before prescribing a filename or variable.
- Read applicable nested instructions before changing files:
  [app](app/AGENTS.md), [src](src/AGENTS.md),
  [tests](__tests__/AGENTS.md), [scripts](scripts/AGENTS.md).
- Use [docs](docs/) and [README](README.md) for setup and architecture details;
  verify them against code. Keep instructions short and update them when workflows
  change. `CLAUDE.md` files only reference their corresponding `AGENTS.md`.

## Completion and commits

1. Always run `npm run format` before committing or opening a PR. Review its diff
   and keep the commit scoped to the request; report unrelated formatting changes.
2. When `.js`, `.jsx`, `.ts`, or `.tsx` files change, run `npm run lint`. For every
   modified or new source file, run relevant Jest tests with `--coverage` and
   `--collectCoverageFrom='<file>'`; statements, branches, functions, and lines must
   each reach 80%. After scoped coverage passes, run full `npm test`.
   Documentation-only changes do not require lint or Jest.
3. If a check fails, fix only the reported issues and rerun that check. ENOSPC
   watcher warnings alone are expected; confirm whether the command actually failed.
   Do not bypass hooks or commit failing work. If blocked, preserve the files and
   explain what remains.
4. Review the final diff and stage only this task's files or hunks. After staging,
   use `git diff --exit-code` to check for unstaged changes in those files; staged
   changes are expected before a commit. Unrelated existing changes must be preserved
   and do not need to be committed to finish this task.
5. Commit completed, passing work on the assigned branch using a conventional
   commit unless the user explicitly asks to leave it uncommitted. Do not push or
   open a PR unless requested. Report the commit hash and remaining changes.
6. Summarize the result and checks, and give manual testing steps (or say no runtime
   behavior changed). Provide the commit title and body in separate fenced blocks.
   Keep PR descriptions brief, omit a testing section, and omit agent session links.
