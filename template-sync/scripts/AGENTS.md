# Tooling scripts

- Inspect `../package.json` and the called script before describing or changing an
  npm command. Keep command documentation in sync with behavior.
- `run-native.mjs` builds iOS/Android with `--no-bundler`; Metro runs separately via
  `npm start`. Preserve this behavior when editing native launch tooling.
- Prefer the pinned mise toolchain and npm. Keep system prerequisites explicit.
- Do not delete lockfiles, regenerate native folders with `prebuild --clean`, or
  clear shared caches as a default fix. Establish the cause and coordinate any
  regeneration with active builds first.
- Keep scripts compatible with their actual runtime and preserve exit codes and
  useful error output. Never print secrets or embed credentials in commands.
