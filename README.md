# Expo Template

This repository contains two parts: the Expo app payload in \`template-sync/\` and
the repository tooling that maintains and validates it.

## Create an app

\`\`\`sh
npx create-expo-app my-app --template https://github.com/luvenapps/expo-template/tree/main/template-sync
\`\`\`

Create Expo App reads the contents of \`template-sync/\` as the app root. Run app
commands from the generated \`my-app\` directory. GitHub subdirectory templates
are supported by Create Expo App ([documentation](https://github.com/expo/expo/blob/main/packages/create-expo/README.md)).

## Repository structure

The tree below lists every root-level item and every item at the top of
\`template-sync/\`. Contents inside the app's source directories are collapsed;
they remain part of the sync payload.

\`\`\`text
.
├── .github/
│ ├── scripts/ # Repository CI helpers
│ └── workflows/ # Repo CI and template source sync
├── .vscode/ # Repository editor settings
├── **tests**/
│ └── scripts/ # Root sync and CI helper tests
├── docs/
│ └── template-refresh.md # Source sync and review guide
├── scripts/
│ └── sync-template-source.mjs # Updates only template-sync/
├── template-sync/ # Complete generated Expo app payload
│ ├── **mocks**/
│ ├── **tests**/
│ ├── _github/ # Restored as .github by postinstall
│ ├── _husky/ # Restored as .husky by postinstall
│ ├── _maestro/ # Restored as .maestro by postinstall
│ ├── app/
│ ├── assets/
│ ├── docs/
│ ├── eslint-rules/
│ ├── plugins/
│ ├── public/
│ ├── scripts/
│ │ └── postinstall.mjs
│ ├── src/
│ ├── supabase/
│ ├── .env.example
│ ├── .gitignore
│ ├── .mcp.json
│ ├── .mise.toml
│ ├── .template-sync-manifest.json
│ ├── _AGENTS.md
│ ├── _CLAUDE.md
│ ├── _gitignore
│ ├── _mise.toml
│ ├── _prettierignore
│ ├── _prettierrc.json
│ ├── _renovate.json
│ ├── LICENSE
│ ├── README.md
│ ├── app.config.ts
│ ├── babel.config.js
│ ├── commitlint.config.js # Generated app commit rules
│ ├── drizzle.config.postgres.ts
│ ├── drizzle.config.sqlite.ts
│ ├── eas.json
│ ├── eslint.config.js
│ ├── index.js # App entry point
│ ├── jest.config.js
│ ├── metro.config.js
│ ├── package.json
│ ├── package-lock.json # Or pnpm-lock.yaml for a pnpm app
│ ├── tamagui.build.ts
│ ├── tamagui.config.ts
│ └── tsconfig.json
├── .gitignore
├── .mise.ci.toml # CI tool versions, including pnpm
├── .mise.toml # Root maintenance toolchain
├── .prettierignore
├── .prettierrc.json
├── AGENTS.md
├── CLAUDE.md
├── LICENSE
├── README.md
├── _mcp-claude.json
├── _mcp-vscode.json
├── commitlint.config.js # Root repo commit rules
├── credentials.json # Root-only; outside the sync payload
├── eslint.config.js
├── jest.config.js
├── package.json
├── package-lock.json
├── renovate.json
└── tsconfig.json
\`\`\`

The sync workflow updates and removes files only inside \`template-sync/\`. Root
documentation, credentials, CI, and tooling stay specific to expo-template. App
assets are included in the sync; \`credentials.json\` stays outside it.

Root tooling uses npm. App CI selects npm or pnpm from the generated app's single
lockfile. It fails if both supported lockfiles or neither lockfile are present.
The pnpm version used by template CI is pinned in \`.mise.ci.toml\`.

See [docs/template-refresh.md](docs/template-refresh.md) for the source sync
workflow and review process.
