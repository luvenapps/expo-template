# Expo Template

This repository keeps the app template in `template-sync/` and the tooling for maintaining it at the repository root.

## Create an app

```sh
npx create-expo-app my-app \
  --template https://github.com/luvenapps/expo-template/tree/main/template-sync
```

Create Expo App uses `template-sync/` as the root of the generated app. Run app commands from `my-app/`. See the [Create Expo App template documentation](https://github.com/expo/expo/blob/main/packages/create-expo/README.md) for details about GitHub subdirectory templates.

## Repository structure

The repository root contains expo-template's own CI, sync tooling, and configuration. Only `template-sync/` is used to create an app.

```text
expo-template/
├── .github/                      # Repository workflows and CI scripts
├── __tests__/
│   └── scripts/                  # Tests for repository CI helpers
├── docs/
│   └── template-refresh.md       # Template source sync and review guide
├── scripts/
│   └── sync-template-source.mjs  # Updates only template-sync/
├── template-sync/                # Complete generated app payload
├── .gitignore
├── .mise.ci.toml                 # CI tool versions
├── .mise.toml                    # Root maintenance toolchain
├── .prettierignore
├── .prettierrc.json
├── AGENTS.md
├── CLAUDE.md
├── LICENSE
├── README.md
├── _mcp-claude.json
├── _mcp-vscode.json
├── commitlint.config.js          # Repository commit rules
├── credentials.json             # Used by Android CI; not part of the app payload
├── eslint.config.js
├── jest.config.js
├── package.json
├── package-lock.json
├── renovate.json
└── tsconfig.json
```

`template-sync/` is the app root passed to Create Expo App. Its source layout is:

```text
template-sync/
├── __mocks__/
├── __tests__/
├── _github/                      # Restored as .github/ by postinstall
├── _husky/                       # Restored as .husky/ by postinstall
├── _maestro/                     # Restored as .maestro/ by postinstall
├── app/
├── assets/
├── docs/
├── eslint-rules/
├── plugins/
├── public/
├── scripts/
│   └── postinstall.mjs
├── src/
├── supabase/
├── .env.example
├── .gitignore
├── .mcp.json
├── .mise.toml
├── .template-sync-manifest.json
├── _AGENTS.md
├── _CLAUDE.md
├── _gitignore
├── _mise.toml
├── _prettierignore
├── _prettierrc.json
├── _renovate.json
├── LICENSE
├── README.md
├── app.config.ts
├── babel.config.js
├── commitlint.config.js          # Generated app commit rules
├── drizzle.config.postgres.ts
├── drizzle.config.sqlite.ts
├── eas.json
├── eslint.config.js
├── index.js                      # App entry point
├── jest.config.js
├── metro.config.js
├── package.json
├── package-lock.json             # Replaced by pnpm-lock.yaml when applicable
├── tamagui.build.ts
├── tamagui.config.ts
└── tsconfig.json
```

The sync workflow changes files only in `template-sync/`. Root documentation, credentials, CI, and tooling stay specific to expo-template. The Android workflow copies the root `credentials.json` into its generated app for the local EAS build.

Root tooling uses npm. Template CI selects npm or pnpm from the generated app's lockfile and fails if both supported lockfiles or neither is present. The pnpm version used by template CI is pinned in `.mise.ci.toml`.

See [docs/template-refresh.md](docs/template-refresh.md) for the source sync and review process.
